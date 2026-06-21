// Need-state classification (PRD §6.1).
//
// Two implementations live here:
//   1. classifyNeedState()  — the PRODUCT path. A bounded, single-turn LLM call
//      returning strict JSON. Low-confidence inputs trigger ONE clarifying
//      question instead of a guess.
//   2. keywordBaseline()    — a deterministic, offline baseline. It is (a) the
//      benchmark the eval harness scores the LLM against, and (b) the MOCK_LLM
//      stub so the app runs with no key. It is intentionally simple; the eval
//      error analysis is largely a study of where this baseline fails.

import {
  NEED_STATES,
  NEED_STATE_IDS,
  DEFAULT_NEED_STATE,
  CONFIDENCE_THRESHOLD,
} from "./needStates.js";
import { complete, parseJSONObject } from "./llm.js";

// --- Deterministic keyword baseline -----------------------------------------

// Lexicons across the three eval languages (EN / ES / DE). Phrases are matched
// as case-insensitive substrings; single words as loose tokens. This is a
// baseline — overlaps and misses are expected and are exactly what the error
// analysis dissects.
const LEXICON = {
  distract: [
    "distract", "take my mind off", "mind off", "forget about", "stop thinking",
    "don't want to think", "dont want to think", "focus", "concentrate", "need to work",
    "get through work", "study", "something to get lost in", "absorb",
    "distraer", "distraerme", "olvidar", "no quiero pensar", "concentrar", "concentrarme", "trabajar", "estudiar",
    "ablenken", "ablenkung", "vergessen", "nicht nachdenken", "konzentrieren", "arbeiten",
  ],
  validate: [
    "sad", "crying", "cry", "heartbroken", "heartbreak", "broke up", "breakup", "miss them",
    "let it out", "sit with it", "feel it", "feel everything", "grief", "grieving", "hurts",
    "triste", "llorar", "llorando", "roto", "rota", "ruptura", "desahogar", "sentir",
    "traurig", "weinen", "weine", "herzschmerz", "trennung", "fühlen", "fuehlen",
  ],
  calm: [
    "anxious", "anxiety", "stressed", "stress", "overwhelmed", "panic", "panicking",
    "can't sleep", "cant sleep", "calm", "relax", "slow down", "racing thoughts", "wound up",
    "ansioso", "ansiosa", "ansiedad", "estrés", "estres", "estresado", "calma", "calmar", "relajar", "dormir", "no puedo dormir",
    "ängstlich", "aengstlich", "angst", "stress", "gestresst", "überfordert", "ueberfordert", "beruhigen", "entspannen", "schlafen", "kann nicht schlafen",
  ],
  energize: [
    "energy", "no energy", "need energy", "pump", "pumped", "motivate", "motivation",
    "workout", "work out", "gym", "run", "get moving", "wake up", "hype", "let's go", "lets go",
    "energía", "energia", "sin energía", "motivar", "motivación", "gimnasio", "correr", "animar", "ánimo", "vamos",
    "energie", "keine energie", "motivieren", "motivation", "sport", "laufen", "aufwachen", "loslegen",
  ],
  company: [
    "lonely", "alone", "by myself", "empty apartment", "empty flat", "silence", "so quiet",
    "no one to talk", "someone to talk", "voices in the room", "keep me company", "feel less alone",
    "solo", "sola", "soledad", "compañía", "compania", "silencio", "tan callado", "hacer compañía", "menos solo",
    "einsam", "allein", "alleine", "stille", "leise wohnung", "gesellschaft", "weniger allein",
  ],
};

function countMatches(textLower, phrases) {
  let n = 0;
  const hits = [];
  for (const p of phrases) {
    if (textLower.includes(p)) {
      n += 1;
      hits.push(p);
    }
  }
  return { n, hits };
}

/**
 * Deterministic baseline classification.
 * @returns {{needState:string, confidence:number, scores:object, hits:string[], lowConfidence:boolean}}
 */
export function keywordBaseline(text) {
  const t = (text || "").toLowerCase();
  const scores = {};
  let best = null;
  let bestN = 0;
  let total = 0;
  let bestHits = [];
  for (const id of NEED_STATE_IDS) {
    const { n, hits } = countMatches(t, LEXICON[id]);
    scores[id] = n;
    total += n;
    if (n > bestN) {
      bestN = n;
      best = id;
      bestHits = hits;
    }
  }
  if (!best) {
    return {
      needState: DEFAULT_NEED_STATE,
      confidence: 0.2,
      scores,
      hits: [],
      lowConfidence: true,
    };
  }
  // Confidence proxy: share of total keyword mass on the winning class.
  const confidence = total > 0 ? Math.min(0.95, 0.5 + (bestN / total) * 0.45) : 0.2;
  return {
    needState: best,
    confidence: Number(confidence.toFixed(2)),
    scores,
    hits: bestHits,
    lowConfidence: confidence < CONFIDENCE_THRESHOLD,
  };
}

// --- LLM product path -------------------------------------------------------

const SYSTEM = `You classify a short message describing how someone feels into exactly ONE "need-state" that tells a music/podcast/audiobook recommender what kind of audio would help right now.

You are NOT a therapist and you do NOT assess crisis or self-harm — a separate system already handled that before you. Just pick the best audio need-state.

The five need-states:
- distract: wants to stop ruminating; get absorbed; focus or work; take their mind off it.
- validate: wants to feel understood; sit with the feeling; "let it out"; sadness/heartbreak/grief they want to lean into.
- calm: wants to downregulate; anxious, stressed, overwhelmed, can't sleep, racing thoughts.
- energize: wants to get moving again; low energy but wants a lift; workout/motivation/hype.
- company: wants to hear human voices; lonely, alone, silence, wants warmth in the room.

Rules:
- Input may be in any language, including code-mixed (e.g. Spanish/Catalan, German/English). Handle it.
- Handle sarcasm ("great, fired again, love that for me" = negative), understatement ("I'm fine" after bad news), and mixed states (sad but needs to work -> pick the dominant ACTIONABLE need; "needs to work" -> distract).
- Output STRICT JSON only, no prose:
  {"need_state":"<one of: distract|validate|calm|energize|company>","confidence":<0..1>,"rationale":"<<=12 words>"}
- confidence reflects how clear the signal is. Ambiguous, contradictory, or near-empty input -> confidence below 0.55.`;

/**
 * Product classification via the LLM.
 * @param {string} text
 * @returns {Promise<{needState:string, confidence:number, rationale:string, lowConfidence:boolean, source:string}>}
 */
export async function classifyNeedState(text) {
  const raw = await complete({
    system: SYSTEM,
    user: text,
    maxTokens: 120,
    temperature: 0,
    // MOCK_LLM stub: reuse the deterministic baseline so the app runs key-free.
    mockFn: (u) => {
      const b = keywordBaseline(u);
      return JSON.stringify({
        need_state: b.needState,
        confidence: b.confidence,
        rationale: "keyword baseline (mock)",
      });
    },
  });

  const parsed = parseJSONObject(raw);
  if (!parsed || !NEED_STATE_IDS.includes(parsed.need_state)) {
    // Defensive fallback: never throw a classification error at the user; fall
    // back to the deterministic baseline and force a clarifying question.
    const b = keywordBaseline(text);
    return {
      needState: b.needState,
      confidence: Math.min(b.confidence, 0.5),
      rationale: "fallback: baseline (unparseable model output)",
      lowConfidence: true,
      source: "baseline-fallback",
    };
  }

  const confidence = Number(parsed.confidence) || 0;
  return {
    needState: parsed.need_state,
    confidence: Number(confidence.toFixed(2)),
    rationale: String(parsed.rationale || "").slice(0, 120),
    lowConfidence: confidence < CONFIDENCE_THRESHOLD,
    source: "llm",
  };
}

export { NEED_STATES };
