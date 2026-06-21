# Mood Check-In for Spotify AI DJ — working prototype

A runnable prototype of the **Mood Check-In** feature: a consent-first, EU-first
*emotion-aware recommendation layer* where a user explicitly tells the DJ how
they feel and gets the right audio for that moment — with an independent crisis
guardrail that hands off to real help instead of a playlist.

This repo turns a PRD into the three companion artifacts the PRD itself promised:
a **working demo**, a **150-input labeled eval set**, and a **classification
error analysis**.

> Independent portfolio case study by **Upasana Sen** (AI Product Manager). Not
> affiliated with, endorsed by, or connected to Spotify. The audio catalog is
> mock data; "Spotify" is referenced only to frame the product context.

📄 **The spec:** [`docs/PRD.md`](docs/PRD.md) · 🏗 **How it works:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · 🧪 **Findings:** [`eval/ERROR-ANALYSIS.md`](eval/ERROR-ANALYSIS.md)

---

## What it does

1. **Explicit check-in** — tap a mood preset or free-type / speak it, in any
   language (English, Spanish/Catalan, German/English code-mixing supported).
2. **Need-state classification** — an LLM sorts the input into one of five
   recommendable need-states: **Distract · Validate · Calm · Energize · Company**.
   Low-confidence inputs get *one* clarifying question, never a guess.
3. **Independent crisis guardrail** — a separate classifier (LLM + a deterministic,
   escalate-only keyword net) runs first. A **hard** signal shows crisis resources
   and *no recommendation, ever*; an ambiguous **soft** signal shows support
   *alongside* recommendations.
4. **Offer, don't prescribe** — 2–3 options across formats (music / podcast /
   audiobook) with one-line reasons, honoring exclusions like "nothing romantic".
5. **Consent + control** — GDPR-style opt-in gate, "Did that help?" feedback, and
   a privacy drawer to view / delete / disable mood data.

## Quickstart

```bash
git clone <your-repo-url>
cd "Spotify AI PM Project"
npm install

# Option A — full product path (real LLM):
cp .env.example .env        # then add your ANTHROPIC_API_KEY
npm start                   # http://localhost:3000

# Option B — no API key (deterministic stub, great for a quick look):
MOCK_LLM=1 npm start        # http://localhost:3000
```

Run the eval:

```bash
npm run eval                # offline baseline -> eval/results-baseline.json (committed)
npm run eval:llm            # production classifier (needs ANTHROPIC_API_KEY)
```

## Try these inputs

| Input | What you should see |
|---|---|
| `just got laid off, can't focus` | Distract — a gripping podcast + a contrast option |
| `going through a breakup, nothing romantic please` | Validate — romantic tracks filtered out |
| `so anxious I can't sleep` | Calm — ambient / breathing-paced |
| `feeling really alone in a new city` | Company — warm conversational podcasts |
| `I'm fine.` (after bad news) | Low-confidence → one clarifying question |
| an input signalling self-harm | **Crisis screen only** — resources, no playlist |
| `this week is killing me` | Normal venting — *not* a crisis screen (idiom) |

## Eval results (measured)

From the committed **offline keyword baseline** (`eval/results-baseline.json`).
This is the floor the production LLM has to beat — its errors are deliberately
instructive:

- **Need-state accuracy: 60.6%** (132 items). Every miss collapses into the
  `validate` default bucket — a token matcher is a poor router for varied
  emotional language. Idioms are the worst class (**7.7%**).
- **Crisis hard-tier: 100% precision, 44.4% recall.** The deterministic net never
  false-alarms but misses *indirect* phrasing ("there's no reason for me to be
  here") — which is the whole case for the independent LLM layer, whose target is
  **≥99% recall** before launch.

Full breakdown, confusion matrix, and the dangerous-failure list:
[`eval/ERROR-ANALYSIS.md`](eval/ERROR-ANALYSIS.md). *(LLM-mode numbers are produced
by running `npm run eval:llm`; they are not asserted in this repo.)*

## How it maps to the PRD

| PRD requirement | Where |
|---|---|
| P0-1 explicit input (presets + free text) | `public/`, `server.js` |
| P0-2 LLM need-state classification | `src/classifier.js` |
| P0-3 / P0-4 crisis guardrail (hard / soft) | `src/crisisDetector.js` |
| P0-5 multi-format offers | `src/recommender.js` |
| P0-6 persistent AI disclosure | `public/index.html` |
| P0-7 GDPR-native privacy controls | `server.js`, `public/app.js` |
| P0-8 exclusion rules | `src/recommender.js` |
| §6.1 eval design + error analysis | `data/eval-set.json`, `eval/` |

## Project structure

```
.
├── docs/PRD.md            # canonical spec (v2, EU-first)
├── docs/ARCHITECTURE.md   # design + component map + safety rationale
├── server.js              # API + crisis-first orchestration
├── src/                   # classifier, crisis detector, recommender, llm, taxonomy
├── public/                # the web UI (no build step)
├── data/                  # eval set, mock catalog, crisis resources
├── eval/                  # harness, committed baseline results, error analysis
└── PRD - Mood Check-In.md # earlier v1 draft (kept for history)
```

## Safety & honesty notes

- The crisis copy and per-country helpline lists are **placeholders pending
  clinical review** (PRD §10). The prototype ships only resources it can state
  with confidence (EU emergency 112; findahelpline.com) and deliberately leaves
  country-specific numbers empty rather than guess.
- Mood data is treated as sensitive: no disk persistence, opt-in only,
  viewable/deletable. This is a prototype, not a production data system.
- Several facts and figures in the PRD (regulatory dates, DJ's language/country
  count, the 73.8% statistic) should be **re-verified against primary sources**
  before any external use.

## License

MIT — see [`LICENSE`](LICENSE).
```
