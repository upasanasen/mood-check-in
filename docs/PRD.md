# PRD: Mood Check-In for Spotify AI DJ

**Working title:** Mood Check-In ("Tell DJ how you're feeling")
**Author:** Upasana Sen — AI Product Manager (portfolio case study)
**Status:** Draft v2 · June 2026
**Document type:** Product Requirements Document
**Companion artifacts:** Need-state eval set (150 labeled inputs, 3 languages) · classification error analysis · working demo

> This is the canonical spec the prototype in this repo is built against. It is an independent portfolio case study and is not affiliated with Spotify.

**Why this case study:** Spotify is a European company operating under the strictest AI and data-protection regime in the world. This PRD treats GDPR and the EU AI Act not as compliance overhead but as design inputs — the thesis is that a consent-first, explicitly bounded emotional feature is more defensible and more trusted precisely because it is built for the EU first.

## 1. Problem Statement

People already use Spotify to manage their emotions — breakup playlists, "sad songs" sessions, true-crime podcasts as distraction after a hard day. Research consistently shows music is one of the most common emotional coping tools: in one UK study during COVID-19 lockdowns, 73.8% of participants reported using music to cope with negative emotions (Frontiers in Psychology, 2021), and a 2024 meta-analysis confirms music's measurable effect on emotion regulation (PMC).

But today this behavior is accidental, not designed. Spotify's AI DJ and daylist infer mood from listening history and time of day — they never ask. A user who just lost their job, ended a relationship, or feels alone in a new city must hunt for the right audio themselves, at exactly the moment they have the least energy to do so. The cost of not solving it: missed engagement at the highest-intent listening moments, and a defensible differentiation opportunity (emotional context) left open to Apple, YouTube Music, and standalone wellness apps.

This product is not a therapist and not an AI companion. It is an emotion-aware recommendation layer: the user explicitly shares how they feel, and Spotify responds with the right audio for that moment — plus a safe handoff to real help when the input signals crisis.

## 2. Strategic Fit (Why Spotify, Why Now, Why EU-First)

**AI DJ already accepts prompts.** As of late 2025, DJ supports voice and text requests to steer the session, with suggested prompts based on listening patterns (How-To Geek). Mood Check-In is a natural next prompt type — not a new surface.

**DJ is scaling globally** — now 6 languages and 75+ countries as of May 2026 (Spotify Newsroom). Multilingual emotional input is a launch-day reality, not an edge case.

**Spotify's catalog uniquely spans the need:** music + podcasts + audiobooks in one app. Wellness and mental-health podcasts were among the top categories in Spotify Wrapped 2025 (Reader's Digest).

**Regulation now rewards doing this right — and the EU is the proving ground.** The EU AI Act's transparency obligations for AI systems that interact with people are in force, and the Act draws a hard line around emotion-inference systems while leaving explicit, user-initiated input far less encumbered. In the US, New York's AI Companion Models Law (Nov 2025) and California's SB 243 (Oct 2025) require AI disclosure and crisis-response protocols for emotionally responsive chatbots (Morrison Foerster). A design that clears the EU bar clears every bar. For a Stockholm-headquartered company, "GDPR-native emotional AI" is a brand asset competitors headquartered elsewhere cannot easily claim.

### 2.1 Competitive Landscape

| Player | What they do today | Gap Mood Check-In exploits |
|---|---|---|
| Apple Music | Mood/activity playlists, curated; no conversational layer | No explicit emotional input; no cross-format catalog (no podcasts/audiobooks in-app) |
| YouTube Music | Mood filters, algorithmic radio | Inference-only; no consent-first emotional UX; weaker podcast catalog in EU |
| Calm / Headspace | Purpose-built emotional audio | Single-format, subscription wall, no general music catalog; users must switch apps at the moment of need |
| Endel / mood-AI startups | Generative adaptive soundscapes | No catalog breadth, tiny reach; acquisition targets, not threats |
| Spotify (status quo) | daylist, DJ — implicit mood inference | Never asks; emotional moments served by accident |

Spotify is the only player with (a) all three audio formats, (b) a conversational AI surface already shipped, and (c) the scale to make a consent-first design an industry norm.

## 3. Goals

- **User goal:** Reduce effort to find emotionally-fitting audio — ≥60% of check-ins end in a session ≥10 minutes (vs. baseline DJ session start rate, to be measured pre-launch).
- **User goal:** Users report the recommendation matched their need — ≥70% positive response on the post-session "Did that help?" prompt, with response rate itself tracked as a denominator metric (see §8).
- **Business goal:** Lift 7-day retention of check-in users vs. matched control (holdout experiment). Target +3%; this would be an exceptional result for a single feature — even +1% at Spotify's scale justifies the investment.
- **Business goal:** Differentiate Premium — Mood Check-In as a Premium-tier DJ capability supporting conversion.
- **Trust goal:** Zero tolerance on safety — 100% of crisis-flagged inputs receive the crisis-resource flow; no recommendation is ever served instead.

## 4. Non-Goals

- **Not a therapy or diagnosis tool.** No clinical claims, no symptom assessment, no "depression detection." *Why:* safety, liability, and it's a different product requiring clinical validation.
- **No implicit emotion inference in v1.** We do not infer mood from listening history, voice tone, or typing patterns. *Why:* emotion inference is the most heavily scrutinized category under the EU AI Act, and inferred emotional state is high-risk territory under GDPR; explicit, user-initiated disclosure is both the trust foundation and the regulatory safe harbor. (P2: opt-in inference, only if v1 proves value and passes a dedicated DPIA.)
- **Not an open-ended chat companion.** The DJ does not hold extended conversations about the user's problems. One check-in → recommendation → optional follow-up. *Why:* emotional-dependency risk documented for AI companions (Nature Machine Intelligence, 2025); regulatory scope (NY/CA companion laws, and likely future EU guidance) expands sharply for companion-style products.
- **No social features in v1** (sharing moods, friend check-ins). *Why:* privacy complexity; unproven need.
- **No advertiser access to mood data — ever.** Stated as a product principle, not just a non-goal.

## 5. Personas & User Stories

*(Personas are illustrative composites; Phase 0 interviews will validate or kill them.)*

**Persona A — "Klara," 24, Malmö, job-seeker.** Months of applications and rejections; oscillates between frustration and numbness; listens during commutes and late nights.
- As a frustrated job-seeker, I want to tell DJ "I got rejected again, I'm exhausted" so that I get audio that fits — without building a playlist myself.
- As a job-seeker, I want a mix of options (calming music / a career podcast / pure distraction) so that I choose how to cope, rather than being told.
- As a returning user, I want DJ to remember (with my consent) what helped last time so that check-ins get faster over time.

**Persona B — "Marc," 29, Barcelona, just went through a breakup.** Avoids "their" songs; wants absorption, not advice; types check-ins in a mix of Spanish and Catalan.
- As someone post-breakup, I want to say "don't play anything romantic" so that the session never ambushes me with a trigger.
- As someone seeking distraction, I want a gripping serialized podcast or audiobook so that I stay absorbed instead of ruminating.
- As a user leaning into the feeling, I want a "let it out" option (sad music) so that the product validates rather than always redirects — research shows both distraction and introspection are legitimate coping modes (PMC scoping review).
- As a bilingual user, I want to type the way I actually speak — code-mixed — and still be understood.

**Persona C — "Deniz," 31, moved alone to Berlin.** Evenings feel empty; wants voices in the room.
- As someone feeling lonely, I want talk-heavy, warm podcasts so that the apartment feels less silent.
- As a privacy-conscious user, I want to delete my mood history and turn the feature off so that I stay in control of sensitive data.

**Edge / safety stories:**
- As a user in acute distress, when my input signals self-harm, I am shown crisis resources (country-appropriate helplines) immediately and prominently — never a playlist as the primary response.
- As a user venting normally ("this week is killing me"), I am not hit with a crisis screen — ambiguous inputs get a soft-touch resource link alongside recommendations, not instead of them.
- As any user, I always see that I'm interacting with AI, not a person.

## 6. How It Works (Core Flow)

1. **Entry:** "How are you feeling?" chip inside AI DJ (and a card on Home). Always user-initiated.
2. **Input:** Tap a mood (quick options) or free-type/speak ("just got laid off, can't focus") — in any DJ-supported language, including code-mixed input.
3. **Need-state classification (the AI layer):** An LLM classifies the input into a need-state:

| Need-state | What the user wants | Audio response |
|---|---|---|
| Distract | Stop ruminating | Gripping serialized podcast / audiobook / upbeat unfamiliar music |
| Validate | Feel understood | Mood-matched music ("let it out" mix) |
| Calm | Downregulate | Ambient, breathing-paced, low-tempo |
| Energize | Get moving again | High-energy familiar favorites |
| Company | Hear human voices | Warm conversational podcasts |
| Crisis | Real help | Helpline resources + supportive copy; no recommendation flow |

The taxonomy itself is easily copied; the durable asset is the closed feedback loop — check-in → outcome signal ("Did that help?") → per-user need-state weights — which compounds with usage and which no competitor without all three audio formats can replicate.

4. **Retrieval (how a need-state becomes a recommendation):** v1 deliberately does not invent a new recommender. Each need-state maps to a curated, editorially maintained candidate pool per market (e.g., "Distract" → vetted serialized podcasts and page-turner audiobooks; "Calm" → low-tempo/ambient pools), which is then filtered and ranked by the existing personalization stack (taste profile, language, exclusion rules). Editorial-first reduces tone-deaf outputs in v1; algorithmic candidate generation is a P1 experiment once the feedback loop has data.
5. **Offer, don't prescribe:** Show 2–3 options across need-states with one-line reasons ("To take your mind off it…" / "If you'd rather sit with it…"). User picks.
6. **Session plays** with exclusion rules honored (e.g., "nothing romantic").
7. **Optional follow-up:** At session end (or next open), one tap: "Did that help?" 👍/👎 — feeds personalization and the success metric. Max one follow-up; never push notifications about the user's mood.

### 6.1 Classification: eval design, confidence handling, abuse surface

- **Eval set:** ≥1,000 inputs spanning DJ's supported languages plus realistic code-mixed inputs (Spanish/Catalan, German/English, Swedish/English), labeled by ≥2 human raters with inter-rater agreement reported per need-state. Known hard cases — sarcasm ("great, fired again, love that for me"), understatement ("I'm fine"), mixed states (sad and needs to work) — are oversampled. A 150-input pilot version of this eval, with error analysis, accompanies this PRD as a companion artifact.
- **Low-confidence fallback:** If classification confidence is below threshold, the DJ asks one clarifying chip-question ("Want to take your mind off it, or sit with it?") rather than guessing. Never more than one clarification.
- **Model & cost:** Classification is a bounded, single-turn task — a small/distilled model behind the existing DJ prompt pipeline, not a frontier model per check-in. Latency budget <1.5s; cost per check-in budgeted with eng in Phase 1.
- **Abuse surface:** Free text into an LLM is a prompt-injection target, with the crisis filter as the highest-value jailbreak. The crisis detector runs as a separate, independent classifier on raw input, not as an instruction inside the recommendation prompt — so prompt injection against the DJ cannot suppress it. Red-teaming covers both layers.

## 7. Requirements

### P0 — Must-Have (cannot ship without)

| # | Requirement | Acceptance criteria (abridged) |
|---|---|---|
| P0-1 | Explicit mood input (tap presets + free text) | Given the DJ surface, when user taps the check-in chip, then preset moods + free-text field appear; no mood is ever pre-filled from inference |
| P0-2 | LLM need-state classification | ≥90% agreement with human-labeled need-state on internal eval set of ≥1,000 inputs across supported languages incl. code-mixed; inter-rater agreement reported; low-confidence fallback per §6.1 |
| P0-3 | Crisis guardrail (hard tier) | Given input matching self-harm/crisis intent, then crisis-resource screen shows country-appropriate helplines; recommendation flow suppressed; event logged for safety review. Red-team eval: ≥99% recall on crisis test set built with clinical advisor input, covering multilingual and indirect phrasings; false-negative review weekly |
| P0-4 | Crisis guardrail (soft tier) | Given ambiguous distress input, resources appear alongside recommendations, not instead of them — over-triggering the hard tier on normal venting is itself a logged defect |
| P0-5 | Multi-format recommendations | Each check-in returns ≥2 options spanning ≥2 formats (music/podcast/audiobook) where catalog allows |
| P0-6 | AI disclosure | Persistent "DJ is AI" indicator satisfying EU AI Act transparency obligations and NY/CA requirements |
| P0-7 | Privacy controls (GDPR-native) | Mood data treated as special-category data (Art. 9) pending legal confirmation: explicit opt-in consent at first use with clear purpose statement; viewable; deletable; excluded from ad targeting; documented retention limit (proposed: 90 days); DPIA completed before beta |
| P0-8 | Exclusion rules | "Avoid X" honored within session; verified by negative tests |

### P1 — Nice-to-Have (fast follow)

- Memory across check-ins ("last time, lo-fi helped") — opt-in, covered by the same consent and deletion controls.
- Follow-up "Did that help?" loop powering per-user need-state weights.
- Voice input via existing DJ voice prompting.
- Algorithmic candidate generation per need-state (vs. editorial-only pools), A/B'd against editorial baseline.

### P2 — Future Considerations (design for, don't build)

- Opt-in implicit mood signal ("DJ noticed you've been on repeat-heavy late-night sessions — want to check in?") — requires a dedicated DPIA and fresh EU AI Act analysis, since this crosses from explicit input into emotion inference.
- Partnerships with mental-health orgs for vetted resource content per country.
- Wrapped-style private "your year in moods" (user-only, deletable).

## 8. Success Metrics

**Leading (weeks):**
- Check-in adoption: ≥8% of DJ users try it within 30 days (hypothesis-based target; calibrate against daylist feature adoption benchmarks pre-launch).
- Completion: ≥75% of started check-ins end in a session start.
- "Did that help?" positive rate ≥70%, reported alongside its response rate — a 70% positive rate on a 10% response rate means little; both numbers ship together to avoid survivorship-biased readouts.

**Lagging (months):**
- 7-day retention lift for check-in users vs. holdout (causal, via experiment — not correlation). +3% is the stretch target; +1% is the justify-the-feature bar.
- Premium conversion lift among free users hitting the feature gate (target TBD with growth team).
- Brand-trust survey delta on "Spotify cares about my wellbeing."

**Guardrail metrics (watched as closely as success metrics):**
- Crisis-flow recall ≥99% on eval set; precision reviewed weekly (over-triggering erodes trust, under-triggering is unacceptable) — soft-tier design (P0-4) exists specifically to relieve pressure on this tradeoff.
- Opt-out / feature-disable rate <5% of adopters.
- Cannibalization check: total DJ engagement for check-in users vs. control — the feature must add sessions, not relabel them.
- Dependency signal: flag users with >10 check-ins/day for design review — the product should help people cope, not become the coping mechanism (APA, 2026).
- Zero mood-data usage in ad systems (audited).

*All numeric targets above are hypotheses to validate against Spotify-internal baselines; they are directionally reasonable, not benchmarked facts.*

## 9. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Crisis input mishandled (missed) | Critical | Independent crisis classifier (§6.1), red-teaming, clinical advisor review of copy and test set, weekly false-negative audits |
| Crisis flow over-triggers on normal venting | High | Soft tier (P0-4); precision tracked weekly; copy tested in Phase 0 interviews |
| GDPR exposure — mood data as special-category | High | Design assumes Art. 9 applies until legal confirms otherwise: explicit consent, DPIA, 90-day retention, deletion, no ads usage. Treating the strictest reading as default removes rework risk |
| Crisis filter jailbroken via prompt injection | High | Crisis detection decoupled from the recommendation prompt (§6.1); adversarial inputs in red-team suite |
| Emotional dependency / "AI friend" drift | High | No open-ended chat; one follow-up max; dependency metric; companion-law compliance review |
| Privacy backlash ("Spotify tracks my mental state") | High | Explicit-disclosure-only design, no inference in v1, deletable history, no ads usage — communicated in-product, with EU-first framing as a trust story |
| Recommendation feels tone-deaf (upbeat song after bereavement) | Medium | Offer-don't-prescribe UX; exclusion rules; editorial candidate pools in v1; conservative defaults for grief inputs |
| Regulatory drift (further EU AI Act guidance, more US states) | Medium | Legal review per market; feature-flag architecture for per-jurisdiction behavior |

## 10. Open Questions

- **Legal (blocking):** Confirm whether explicit, user-initiated mood input constitutes special-category health data under GDPR Art. 9 in this design. The PRD assumes yes; if legal lands on no, consent UX can be lightened, not rebuilt.
- **Legal (blocking):** EU AI Act classification — confirm the bounded check-in flow falls under transparency obligations only, and that nothing in the design constitutes emotion recognition/inference as restricted by the Act. (Initial read: explicit input ≠ inference — confirm with counsel.)
- **Legal (non-blocking for EU launch):** Do NY/CA companion-chatbot laws apply to a bounded check-in flow when US rollout follows?
- **Clinical advisory (blocking for crisis copy):** Which org reviews crisis-flow language and per-country helpline lists (e.g., coordination with national services across EU markets)?
- **Data science (non-blocking):** Best baseline for adoption targets — daylist launch curve or AI Playlist beta curve?
- **Design (non-blocking):** Should crisis resources also appear as a persistent "Get support" link in settings, independent of check-ins?
- **Engineering (non-blocking):** Confirm <1.5s latency and per-check-in cost budget for classification within DJ's existing prompt pipeline; small-model vs. distilled-model decision.

## 11. Timeline & Phasing (proposal)

- **Phase 0 (4 wks):** Concept validation — 15 user interviews across personas in 2 EU markets; crisis-flow copy with clinical input; DPIA kickoff and legal scoping (GDPR Art. 9 + AI Act read). *Kill criteria:* <40% of interviewees say they'd use it monthly.
- **Phase 1 (8–10 wks):** P0 build; pilot eval set expanded to 1,000+ labeled inputs; internal dogfood; red-team safety evals (crisis recall, prompt injection).
- **Phase 2 (6 wks):** Limited beta, 2 EU markets — Sweden (home market, mature DJ usage, English/Swedish code-mixing) and Spain (tests Spanish/Catalan multilingual input at scale) — Premium-only; holdout experiment running.
- **Phase 3:** Evaluate against metrics; P1 fast-follows; go/no-go on broader EU rollout, then US (with NY/CA review).

## Sources

- Spotify Newsroom — DJ expansion, May 2026
- How-To Geek — AI DJ prompt features
- Frontiers in Psychology — Music in mood regulation during COVID-19 lockdown (73.8% stat)
- PMC — Meta-analysis: musicking and emotion regulation
- PMC — Scoping review: music for emotion regulation
- Morrison Foerster — NY & CA AI companion laws
- Nature Machine Intelligence — Emotional risks of AI companions
- APA Monitor — AI chatbots and emotional connection
- Reader's Digest — Top wellness podcasts, Spotify Wrapped 2025
- EU AI Act (Regulation (EU) 2024/1689) — transparency obligations and emotion-recognition provisions (cite official text or EC guidance in final version)

> **Sourcing note:** citations above are carried over from the PRD draft and several refer to fast-moving regulation and product facts (DJ's language/country count, US state-law dates, the 73.8% figure). Treat specific numbers and dates as **to be re-verified against primary sources** before any external use — they may have changed since the draft and some should be confirmed against the official text.
