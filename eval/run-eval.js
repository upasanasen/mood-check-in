// Eval harness for the need-state classifier and the independent crisis detector.
//
// Usage:
//   node eval/run-eval.js --mode=baseline   # offline deterministic baseline (no key, no deps)
//   node eval/run-eval.js --mode=llm        # the real product classifier (needs ANTHROPIC_API_KEY)
//   npm run eval        (= baseline)
//   npm run eval:llm    (= llm)
//
// It scores two things:
//   1. Need-state classification — on the recommendable items (crisis excluded),
//      with per-class P/R/F1, a confusion matrix, and per-language / per-hard-case
//      breakdowns.
//   2. Crisis tiering — on ALL items: hard-tier recall & precision (the safety
//      guardrail), plus under/over-escalation counts.
//
// Baseline results are committed (eval/results-baseline.json) so the error
// analysis is reproducible and viewable without spending API calls. LLM results
// (eval/results-llm.json) are gitignored.

import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { keywordBaseline, classifyNeedState } from "../src/classifier.js";
import { keywordCrisisCheck, detectCrisis } from "../src/crisisDetector.js";
import { NEED_STATE_IDS } from "../src/needStates.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mode = (process.argv.find((a) => a.startsWith("--mode=")) || "--mode=baseline").split("=")[1];
const TIER_RANK = { none: 0, soft: 1, hard: 2 };

const dataset = JSON.parse(readFileSync(join(__dirname, "../data/eval-set.json"), "utf8"));
const items = dataset.items;

function pct(n, d) {
  return d === 0 ? 0 : Number(((n / d) * 100).toFixed(1));
}

async function classifyOne(item) {
  // Need-state: only meaningful on recommendable items.
  let predNeed = null;
  if (!item.is_crisis && item.need_state !== "crisis") {
    predNeed =
      mode === "llm"
        ? (await classifyNeedState(item.text)).needState
        : keywordBaseline(item.text).needState;
  }
  // Crisis tier: assessed on every item.
  const predTier =
    mode === "llm" ? (await detectCrisis(item.text)).tier : keywordCrisisCheck(item.text).tier;
  return { predNeed, predTier };
}

async function run() {
  console.log(`\nMood Check-In · eval  (mode: ${mode})`);
  console.log(`Dataset: ${items.length} items · ${dataset.items.filter((i) => i.code_mixed).length} code-mixed\n`);

  const preds = [];
  for (const item of items) {
    preds.push({ item, ...(await classifyOne(item)) });
  }

  // ---- Need-state metrics (recommendable items only) ----
  const ns = preds.filter((p) => p.predNeed !== null);
  let nsCorrect = 0;
  const confusion = {};
  const perClass = {};
  const perLang = {};
  const perHardCase = {};
  for (const id of NEED_STATE_IDS) {
    perClass[id] = { tp: 0, fp: 0, fn: 0 };
    confusion[id] = {};
    for (const j of NEED_STATE_IDS) confusion[id][j] = 0;
  }
  for (const p of ns) {
    const exp = p.item.need_state;
    const got = p.predNeed;
    confusion[exp][got] = (confusion[exp][got] || 0) + 1;
    if (exp === got) nsCorrect++;
    if (exp === got) perClass[exp].tp++;
    else { perClass[exp].fn++; perClass[got].fp++; }

    perLang[p.item.language] = perLang[p.item.language] || { c: 0, n: 0 };
    perLang[p.item.language].n++;
    if (exp === got) perLang[p.item.language].c++;

    perHardCase[p.item.hard_case] = perHardCase[p.item.hard_case] || { c: 0, n: 0 };
    perHardCase[p.item.hard_case].n++;
    if (exp === got) perHardCase[p.item.hard_case].c++;
  }
  const perClassScores = {};
  for (const id of NEED_STATE_IDS) {
    const { tp, fp, fn } = perClass[id];
    const precision = tp + fp === 0 ? null : Number((tp / (tp + fp)).toFixed(3));
    const recall = tp + fn === 0 ? null : Number((tp / (tp + fn)).toFixed(3));
    const f1 = precision && recall ? Number(((2 * precision * recall) / (precision + recall)).toFixed(3)) : null;
    perClassScores[id] = { support: tp + fn, precision, recall, f1 };
  }

  // ---- Crisis metrics (all items) ----
  let hardTP = 0, hardFN = 0, hardFP = 0;
  let tierExact = 0, under = 0, over = 0;
  let resourceNeeded = 0, resourceServed = 0;
  const crisisMisses = [];
  for (const p of preds) {
    const exp = p.item.crisis_tier;
    const got = p.predTier;
    if (exp === got) tierExact++;
    else if (TIER_RANK[got] < TIER_RANK[exp]) under++;
    else over++;

    if (exp === "hard") {
      if (got === "hard") hardTP++;
      else { hardFN++; crisisMisses.push({ id: p.item.id, text: p.item.text, expected: exp, got, hard_case: p.item.hard_case }); }
    } else if (got === "hard") {
      hardFP++;
    }

    if (exp === "soft" || exp === "hard") {
      resourceNeeded++;
      if (got === "soft" || got === "hard") resourceServed++;
    }
  }

  const results = {
    mode,
    generatedAt: new Date().toISOString(),
    datasetSize: items.length,
    needState: {
      evaluated: ns.length,
      accuracy: pct(nsCorrect, ns.length),
      perClass: perClassScores,
      perLanguage: Object.fromEntries(
        Object.entries(perLang).map(([k, v]) => [k, pct(v.c, v.n)])
      ),
      perHardCase: Object.fromEntries(
        Object.entries(perHardCase).map(([k, v]) => [k, { accuracy: pct(v.c, v.n), n: v.n }])
      ),
      confusion,
    },
    crisis: {
      evaluated: items.length,
      hardRecall: pct(hardTP, hardTP + hardFN),
      hardPrecision: pct(hardTP, hardTP + hardFP),
      hardTP, hardFN, hardFP,
      tierExactAccuracy: pct(tierExact, items.length),
      underEscalations: under,
      overEscalations: over,
      resourceSafetyRecall: pct(resourceServed, resourceNeeded),
      misses: crisisMisses,
    },
  };

  // ---- Print ----
  console.log("NEED-STATE CLASSIFICATION  (recommendable items, crisis excluded)");
  console.log(`  items evaluated: ${results.needState.evaluated}`);
  console.log(`  overall accuracy: ${results.needState.accuracy}%`);
  console.log("  per-class  (precision / recall / f1 / support):");
  for (const id of NEED_STATE_IDS) {
    const s = perClassScores[id];
    console.log(`    ${id.padEnd(9)} ${fmt(s.precision)} / ${fmt(s.recall)} / ${fmt(s.f1)}  (n=${s.support})`);
  }
  console.log("  per-language accuracy:", results.needState.perLanguage);
  console.log("  per-hard-case accuracy:");
  for (const [k, v] of Object.entries(results.needState.perHardCase)) {
    console.log(`    ${k.padEnd(13)} ${v.accuracy}%  (n=${v.n})`);
  }
  console.log("\n  confusion matrix (rows = expected, cols = predicted):");
  printConfusion(confusion);

  console.log("\nCRISIS TIERING  (all items)");
  console.log(`  HARD recall:    ${results.crisis.hardRecall}%   (TP=${hardTP} FN=${hardFN})   <- safety guardrail`);
  console.log(`  HARD precision: ${results.crisis.hardPrecision}%   (FP=${hardFP})`);
  console.log(`  resource safety recall (soft+hard not dropped to none): ${results.crisis.resourceSafetyRecall}%`);
  console.log(`  tier exact accuracy: ${results.crisis.tierExactAccuracy}%  (under-escalations=${under}, over-escalations=${over})`);
  if (crisisMisses.length) {
    console.log(`  HARD-tier misses (${crisisMisses.length}) — these are the dangerous failures:`);
    for (const m of crisisMisses) console.log(`    [${m.id}] (${m.hard_case}) "${m.text}"  -> ${m.got}`);
  }

  const outName = mode === "llm" ? "results-llm.json" : "results-baseline.json";
  writeFileSync(join(__dirname, outName), JSON.stringify(results, null, 2));
  console.log(`\nWrote eval/${outName}\n`);
}

function fmt(x) { return x === null ? " -- " : x.toFixed(2); }

function printConfusion(confusion) {
  const ids = NEED_STATE_IDS;
  const head = "exp\\got".padEnd(10) + ids.map((i) => i.slice(0, 4).padStart(6)).join("");
  console.log("    " + head);
  for (const r of ids) {
    let line = r.padEnd(10);
    for (const c of ids) line += String(confusion[r][c]).padStart(6);
    console.log("    " + line);
  }
}

run().catch((e) => {
  console.error("Eval failed:", e.message);
  process.exit(1);
});
