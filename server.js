// Mood Check-In — prototype server.
//
// Endpoints:
//   GET  /api/health            -> liveness + which classifier mode is active
//   POST /api/check-in          -> the core flow (crisis-first, then need-state)
//   POST /api/feedback          -> "Did that help?" 👍/👎 (PRD §6 optional follow-up)
//   GET  /api/data?sid=         -> view stored mood history (GDPR access)
//   DELETE /api/data?sid=       -> delete stored mood history (GDPR erasure)
//
// Safety-critical ordering (PRD P0-3): the independent crisis classifier gates
// everything. If it returns the HARD tier, NO recommendation is ever produced.

import "dotenv/config";
import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { detectCrisis, getCrisisResources } from "./src/crisisDetector.js";
import { classifyNeedState } from "./src/classifier.js";
import { recommend } from "./src/recommender.js";
import { CLARIFY } from "./src/needStates.js";
import { isMock, modelName } from "./src/llm.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "32kb" }));
app.use(express.static(join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const MAX_INPUT = 1000;

// Ephemeral, in-memory mood store for the GDPR view/delete demo. Nothing is
// written to disk; everything is gone on restart. In production this would be a
// consented, special-category store with a documented retention limit (PRD P0-7).
const store = new Map(); // sessionId -> [{ ts, text, needState, crisisTier }]

const AI_DISCLOSURE = "You're talking to Spotify's AI DJ, not a person.";

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, classifier: isMock() ? "mock" : "llm", model: modelName() });
});

app.post("/api/check-in", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    const exclusions = req.body?.exclusions ?? [];
    const userLang = req.body?.userLang || null;
    const country = req.body?.country || null;
    const forcedNeedState = req.body?.needState || null; // set after a clarify answer
    const sessionId = req.body?.sessionId || null;
    const remember = Boolean(req.body?.remember); // opt-in memory (PRD P1)

    if (!text) return res.status(400).json({ error: "Empty check-in." });
    if (text.length > MAX_INPUT)
      return res.status(400).json({ error: `Keep it under ${MAX_INPUT} characters.` });

    // Crisis detection and need-state classification both run INDEPENDENTLY on
    // the raw input (run concurrently to respect the latency budget). If no
    // forced need-state, classify; otherwise skip the classify call.
    const [crisis, classification] = await Promise.all([
      detectCrisis(text),
      forcedNeedState
        ? Promise.resolve(null)
        : classifyNeedState(text),
    ]);

    // HARD crisis: resources only. No recommendation, ever.
    if (crisis.tier === "hard") {
      if (sessionId && remember) appendStore(sessionId, { text, needState: "crisis", crisisTier: "hard" });
      return res.json({
        type: "crisis",
        tier: "hard",
        aiDisclosure: AI_DISCLOSURE,
        ...getCrisisResources(country),
      });
    }

    // Low-confidence (and not forced): ask ONE clarifying question.
    if (!forcedNeedState && classification?.lowConfidence) {
      return res.json({
        type: "clarify",
        clarify: CLARIFY,
        crisis: { tier: crisis.tier },
        softResources: crisis.tier === "soft" ? getCrisisResources(country) : null,
        aiDisclosure: AI_DISCLOSURE,
        echo: { text, exclusions, userLang, country, sessionId, remember },
      });
    }

    const needState = forcedNeedState || classification.needState;
    const { offers, excludedTags, note } = recommend(needState, { exclusions, userLang });

    if (sessionId && remember) appendStore(sessionId, { text, needState, crisisTier: crisis.tier });

    return res.json({
      type: "recommendations",
      needState,
      classification: forcedNeedState
        ? { needState, source: "user-clarified", confidence: 1 }
        : classification,
      offers,
      excludedTags,
      note,
      crisis: { tier: crisis.tier }, // 'none' or 'soft'
      softResources: crisis.tier === "soft" ? getCrisisResources(country) : null,
      aiDisclosure: AI_DISCLOSURE,
    });
  } catch (err) {
    console.error("[check-in] error:", err.message);
    // Never leak internals; surface a safe message + setup hint if it's the key.
    const hint = /ANTHROPIC_API_KEY/.test(err.message)
      ? " (Set ANTHROPIC_API_KEY in .env, or run with MOCK_LLM=1.)"
      : "";
    return res.status(500).json({ error: "Something went wrong handling your check-in." + hint });
  }
});

app.post("/api/feedback", (req, res) => {
  const { helpful, needState, sessionId } = req.body || {};
  // In production this powers per-user need-state weights (PRD P1). Here it is
  // just acknowledged + logged; the response rate is tracked alongside the
  // positive rate (PRD §8) so a readout is never survivorship-biased.
  console.log(`[feedback] helpful=${helpful} needState=${needState} sid=${sessionId || "-"}`);
  res.json({ ok: true });
});

app.get("/api/data", (req, res) => {
  const sid = req.query.sid;
  res.json({ sessionId: sid || null, entries: (sid && store.get(sid)) || [] });
});

app.delete("/api/data", (req, res) => {
  const sid = req.query.sid;
  if (sid) store.delete(sid);
  res.json({ ok: true, deleted: Boolean(sid) });
});

function appendStore(sessionId, entry) {
  const list = store.get(sessionId) || [];
  list.push({ ts: new Date().toISOString(), ...entry });
  store.set(sessionId, list);
}

app.listen(PORT, () => {
  console.log(
    `Mood Check-In running at http://localhost:${PORT}  (classifier: ${isMock() ? "mock" : "llm"}, model: ${modelName()})`
  );
});
