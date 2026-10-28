// Regression tests for the layer-2 fail-open bug.
//
// Setup: MOCK_LLM and ANTHROPIC_API_KEY are both cleared BEFORE src/llm.js is
// loaded, so complete() takes the real provider path and throws before any
// network call. That is a faithful stand-in for a missing key, an expired key,
// a rate limit or a provider outage.
//
// Before the fix that exception escaped detectCrisis() and /api/check-in
// answered HTTP 500 with no resources — so an explicit "I want to kill myself"
// got an error screen, even though the deterministic keyword net had already
// flagged it HARD with no network at all.
//
// These tests need no dependencies and no API key:  node --test tests/

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

delete process.env.MOCK_LLM;
delete process.env.ANTHROPIC_API_KEY;

const { detectCrisis, keywordCrisisCheck } = await import("../src/crisisDetector.js");

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataset = JSON.parse(
  readFileSync(join(__dirname, "../data/eval-set.json"), "utf8")
);

test("layer 2 down: explicit self-harm still reaches the HARD tier", async () => {
  const r = await detectCrisis("I want to kill myself");
  assert.equal(r.tier, "hard");
  assert.equal(r.degraded, true, "must announce that the verdict is layer-1 only");
  assert.equal(r.layers.keyword, "hard");
  assert.equal(r.layers.llm, null, "a layer that never answered must not read as agreeing");
  assert.ok(r.layers.llmError, "the failure reason must be recorded");
});

test("layer 2 down: ambiguous distress still reaches the SOFT tier", async () => {
  for (const text of ["I can't go on", "no puedo más", "ich kann nicht mehr"]) {
    const r = await detectCrisis(text);
    assert.equal(r.tier, "soft", `expected soft tier for: ${text}`);
    assert.equal(r.degraded, true);
  }
});

test("layer 2 down: detectCrisis never throws, whatever the input", async () => {
  for (const text of ["", "   ", "🙂", "x".repeat(2000)]) {
    const r = await detectCrisis(text);
    assert.ok(["none", "soft", "hard"].includes(r.tier));
  }
});

test("layer 2 down: every item the keyword net flags HARD is still served as HARD", async () => {
  const flagged = dataset.items.filter((i) => keywordCrisisCheck(i.text).tier === "hard");
  assert.ok(flagged.length > 0, "eval set should contain explicit hard phrasings");
  for (const item of flagged) {
    const r = await detectCrisis(item.text);
    assert.equal(r.tier, "hard", `[${item.id}] degraded mode dropped a hard item`);
  }
});

test("layer 2 down: no 'none' item in the eval set is over-escalated", async () => {
  const benign = dataset.items.filter((i) => i.crisis_tier === "none");
  for (const item of benign) {
    const r = await detectCrisis(item.text);
    assert.equal(
      r.tier,
      "none",
      `[${item.id}] (${item.hard_case}) over-escalated in degraded mode: "${item.text}"`
    );
  }
});

test("degraded mode is the documented floor, not the target", async () => {
  // eval/ERROR-ANALYSIS.md §2: layer 1 alone reaches 44.4% hard recall against
  // a >=99% launch gate. Assert the floor holds and stays honest about itself.
  const hardItems = dataset.items.filter((i) => i.crisis_tier === "hard");
  let caught = 0;
  for (const item of hardItems) {
    const r = await detectCrisis(item.text);
    assert.equal(r.degraded, true);
    if (r.tier === "hard") caught += 1;
  }
  assert.equal(hardItems.length, 18);
  assert.equal(caught, 8, "layer-1-only hard recall should match the committed baseline");
});
