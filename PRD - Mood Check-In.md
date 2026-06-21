# PRD: Mood Check-In for Spotify AI DJ

**Working title:** Mood Check-In ("Tell DJ how you're feeling")
**Author:** Upasana Sen — AI Product Manager (portfolio case study)
**Status:** Draft v1 · June 2026
**Document type:** Product Requirements Document

---

## 1. Problem Statement

People already use Spotify to manage their emotions — breakup playlists, "sad songs" sessions, true-crime podcasts as distraction after a hard day. Research consistently shows music is one of the most common emotional coping tools: in one UK study during COVID-19 lockdowns, **73.8% of participants reported using music to cope with negative emotions** ([Frontiers in Psychology, 2021](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.647879/full)), and a 2024 meta-analysis confirms music's measurable effect on emotion regulation ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11405141/)).

But today this behavior is **accidental, not designed**. Spotify's AI DJ and daylist infer mood from listening history and time of day — they never ask. A user who just lost their job, ended a relationship, or feels alone in a new city must hunt for the right audio themselves, at exactly the moment they have the least energy to do so. The cost of not solving it: missed engagement at the highest-intent listening moments, and a defensible differentiation opportunity (emotional context) left open to Apple, YouTube Music, and standalone wellness apps.

**This product is not a therapist and not an AI companion.** It is an emotion-aware recommendation layer: the user explicitly shares how they feel, and Spotify responds with the right audio for that moment — plus a safe handoff to real help when the input signals crisis.

## 2. Strategic Fit (Why Spotify, Why Now)

- **AI DJ already accepts prompts.** As of late 2025, DJ supports voice and text requests to steer the session, with suggested prompts based on listening patterns ([How-To Geek](https://www.howtogeek.com/spotifys-ai-dj-just-got-three-new-features-but-theres-still-work-to-be-done/)). Mood Check-In is a natural next prompt type — not a new surface.
- **DJ is scaling globally** — now 6 languages and 75+ countries as of May 2026 ([Spotify Newsroom](https://newsroom.spotify.com/2026-05-07/dj-expansion-4-new-languages/)).
- **Spotify's catalog uniquely spans the need:** music + podcasts + audiobooks in one app. Wellness and mental-health podcasts were among the top categories in Spotify Wrapped 2025 ([Reader's Digest](https://www.rd.com/article/top-health-and-wellness-podcasts-spotify-wrapped-2025/)).
- **Regulation now rewards doing this right.** New York's AI Companion Models Law (effective Nov 2025) and California's SB 243 (Oct 2025) require AI disclosure and crisis-response protocols for emotionally responsive chatbots ([Morrison Foerster](https://www.mofo.com/resources/insights/251120-new-york-and-california-enact-landmark-ai)). A consent-first, guardrailed design is both a legal requirement and a trust moat.

## 3. Goals

1. **User goal:** Reduce effort to find emotionally-fitting audio — ≥60% of check-ins end in a session ≥10 minutes (vs. baseline DJ session start rate, to be measured pre-launch).
2. **User goal:** Users report the recommendation matched their need — ≥70% positive response on the post-session "Did that help?" prompt.
3. **Business goal:** Lift 7-day retention of check-in users by ≥3% vs. matched control (holdout experiment).
4. **Business goal:** Differentiate Premium — Mood Check-In as a Premium-tier DJ capability supporting conversion.
5. **Trust goal:** Zero tolerance on safety — 100% of crisis-flagged inputs receive the crisis-resource flow; no recommendation is ever served instead.

## 4. Non-Goals

- **Not a therapy or diagnosis tool.** No clinical claims, no symptom assessment, no "depression detection." Why: safety, liability, and it's a different product requiring clinical validation.
- **No implicit emotion inference in v1.** We do not infer mood from listening history, voice tone, or typing patterns. Why: consent and privacy risk (emotion = sensitive data under GDPR); explicit disclosure is the trust foundation. (P2: opt-in inference, only if v1 proves value.)
- **Not an open-ended chat companion.** The DJ does not hold extended conversations about the user's problems. One check-in → recommendation → optional follow-up. Why: emotional-dependency risk documented for AI companions ([Nature Machine Intelligence, 2025](https://www.nature.com/articles/s42256-025-01093-9)); regulatory scope (NY/CA laws) expands sharply for companion-style products.
- **No social features in v1** (sharing moods, friend check-ins). Why: privacy complexity; unproven need.
- **No advertiser access to mood data — ever.** Stated as a product principle, not just a non-goal.

## 5. Personas & User Stories

**Persona A — "Riya," 24, job-seeker.** Months of applications and rejections; oscillates between frustration and numbness; listens during commutes and late nights.
- As a frustrated job-seeker, I want to tell DJ "I got rejected again, I'm exhausted" so that I get audio that fits — without building a playlist myself.
- As a job-seeker, I want a mix of options (calming music / a career podcast / pure distraction) so that I choose how to cope, rather than being told.
- As a returning user, I want DJ to remember (with my consent) what helped last time so that check-ins get faster over time.

**Persona B — "Sam," 29, just went through a breakup.** Avoids "their" songs; wants absorption, not advice.
- As someone post-breakup, I want to say "don't play anything romantic" so that the session never ambushes me with a trigger.
- As someone seeking distraction, I want a gripping serialized podcast or audiobook (e.g., detective/true-crime) so that I stay absorbed instead of ruminating.
- As a user leaning into the feeling, I want a "let it out" option (sad music) so that the product validates rather than always redirects — research shows both distraction and introspection are legitimate coping modes ([PMC scoping review](https://pmc.ncbi.nlm.nih.gov/articles/PMC11428991/)).

**Persona C — "Dev," 31, alone in a new city.** Evenings feel empty; wants voices in the room.
- As someone feeling lonely, I want talk-heavy, warm podcasts so that the apartment feels less silent.
- As a privacy-conscious user, I want to delete my mood history and turn the feature off so that I stay in control of sensitive data.

**Edge / safety stories:**
- As a user in acute distress, when my input signals self-harm, I am shown crisis resources (region-appropriate helplines) immediately and prominently — never a playlist as the primary response.
- As any user, I always see that I'm interacting with AI, not a person.

## 6. How It Works (Core Flow)

1. **Entry:** "How are you feeling?" chip inside AI DJ (and a card on Home). Always user-initiated.
2. **Input:** Tap a mood (quick options) or free-type/speak ("just got laid off, can't focus").
3. **Need-state mapping (the AI layer):** An LLM classifies the input into a need-state — this is the product's core IP:
   | Need-state | What the user wants | Audio response |
   |---|---|---|
   | Distract | Stop ruminating | Gripping serialized podcast / audiobook / upbeat unfamiliar music |
   | Validate | Feel understood | Mood-matched music ("let it out" mix) |
   | Calm | Downregulate | Ambient, breathing-paced, low-tempo |
   | Energize | Get moving again | High-energy familiar favorites |
   | Company | Hear human voices | Warm conversational podcasts |
   | **Crisis** | **Real help** | **Helpline resources + supportive copy; no recommendation flow** |
4. **Offer, don't prescribe:** Show 2–3 options across need-states with one-line reasons ("To take your mind off it…" / "If you'd rather sit with it…"). User picks.
5. **Session plays** with exclusion rules honored (e.g., "nothing romantic").
6. **Optional follow-up:** At session end (or next open), one tap: "Did that help?" 👍/👎 — feeds personalization and the success metric. Max one follow-up; never push notifications about the user's mood.

## 7. Requirements

### P0 — Must-Have (cannot ship without)
| # | Requirement | Acceptance criteria (abridged) |
|---|---|---|
| P0-1 | Explicit mood input (tap presets + free text) | Given the DJ surface, when user taps the check-in chip, then preset moods + free-text field appear; no mood is ever pre-filled from inference |
| P0-2 | LLM need-state classification | ≥90% agreement with human-labeled need-state on internal eval set of ≥1,000 inputs (incl. Hinglish/code-mixed inputs for India market) |
| P0-3 | Crisis guardrail | Given input matching self-harm/crisis intent, then crisis-resource screen shows region-appropriate helplines; recommendation flow is suppressed; event logged for safety review. Red-team eval: ≥99% recall on crisis test set; false-negative review weekly |
| P0-4 | Multi-format recommendations | Each check-in returns ≥2 options spanning ≥2 formats (music/podcast/audiobook) where catalog allows |
| P0-5 | AI disclosure | Persistent "DJ is AI" indicator per NY/CA requirements |
| P0-6 | Privacy controls | Mood data: opt-in at first use, viewable, deletable, excluded from ad targeting; documented retention limit (proposed: 90 days) |
| P0-7 | Exclusion rules | "Avoid X" honored within session; verified by negative tests |

### P1 — Nice-to-Have (fast follow)
- Memory across check-ins ("last time, lo-fi helped") — opt-in.
- Follow-up "Did that help?" loop powering per-user need-state weights.
- Voice input via existing DJ voice prompting.
- Curated editorial "comfort collections" per need-state (human-in-the-loop quality layer).

### P2 — Future Considerations (design for, don't build)
- Opt-in implicit mood signal ("DJ noticed you've been on repeat-heavy late-night sessions — want to check in?") — requires separate privacy review.
- Partnerships with mental-health orgs for vetted resource content.
- Wrapped-style private "your year in moods" (user-only, deletable).

## 8. Success Metrics

**Leading (weeks):**
- Check-in adoption: ≥8% of DJ users try it within 30 days (hypothesis-based target; calibrate against daylist feature adoption benchmarks pre-launch).
- Completion: ≥75% of started check-ins end in a session start.
- "Did that help?" positive rate ≥70%.

**Lagging (months):**
- +3% 7-day retention for check-in users vs. holdout (causal, via experiment — not correlation).
- Premium conversion lift among free users hitting the feature gate (target TBD with growth team).
- Brand-trust survey delta on "Spotify cares about my wellbeing."

**Guardrail metrics (watched as closely as success metrics):**
- Crisis-flow recall ≥99% on eval set; precision reviewed weekly (over-triggering erodes trust, under-triggering is unacceptable).
- Opt-out / feature-disable rate <5% of adopters.
- Dependency signal: flag users with >10 check-ins/day for design review — the product should help people cope, not become the coping mechanism ([APA, 2026](https://www.apa.org/monitor/2026/01-02/trends-digital-ai-relationships-emotional-connection)).
- Zero mood-data usage in ad systems (audited).

*All numeric targets above are hypotheses to validate against Spotify-internal baselines; they are directionally reasonable, not benchmarked facts.*

## 9. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Crisis input mishandled | Critical | P0-3 guardrail, red-teaming, clinical advisor review of copy, weekly false-negative audits |
| Emotional dependency / "AI friend" drift | High | No open-ended chat; one follow-up max; dependency metric; companion-law compliance review |
| Privacy backlash ("Spotify tracks my mental state") | High | Explicit-disclosure-only design, no inference in v1, deletable history, no ads usage — communicated in-product |
| Recommendation feels tone-deaf (upbeat song after bereavement) | Medium | Offer-don't-prescribe UX; exclusion rules; editorial comfort collections (P1); conservative defaults for grief inputs |
| Regulatory drift (more states/EU AI Act scope) | Medium | Legal review per market; feature-flag architecture for per-jurisdiction behavior |

## 10. Open Questions

- **Legal (blocking):** Does explicit mood input classify as special-category health data under GDPR in our design? Required consent flow per market?
- **Legal (blocking):** Do NY/CA companion-chatbot laws apply to a bounded check-in flow, or only to open-ended companions? (Initial read: bounded flow reduces exposure — confirm.)
- **Clinical advisory (blocking for crisis copy):** Which org reviews crisis-flow language and helpline lists per region?
- **Data science (non-blocking):** Best baseline for adoption targets — daylist launch curve or AI Playlist beta curve?
- **Design (non-blocking):** Should "Crisis" resources also appear as a persistent "Get support" link in settings, independent of check-ins?
- **Engineering (non-blocking):** Latency budget for LLM classification within DJ's existing prompt pipeline (<1.5s target?).

## 11. Timeline & Phasing (proposal)

- **Phase 0 (4 wks):** Concept validation — 15 user interviews across personas; crisis-flow copy with clinical input; legal scoping. Kill criteria: <40% of interviewees say they'd use it monthly.
- **Phase 1 (8–10 wks):** P0 build; internal dogfood; red-team safety evals.
- **Phase 2 (6 wks):** Limited beta, 2 markets (1 US state + India for code-mixed input testing), Premium-only; holdout experiment running.
- **Phase 3:** Evaluate against metrics; P1 fast-follows; go/no-go on broader rollout.

---

## Sources

- [Spotify Newsroom — DJ expansion, May 2026](https://newsroom.spotify.com/2026-05-07/dj-expansion-4-new-languages/)
- [How-To Geek — AI DJ prompt features](https://www.howtogeek.com/spotifys-ai-dj-just-got-three-new-features-but-theres-still-work-to-be-done/)
- [Frontiers in Psychology — Music in mood regulation during COVID-19 lockdown (73.8% stat)](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.647879/full)
- [PMC — Meta-analysis: musicking and emotion regulation](https://pmc.ncbi.nlm.nih.gov/articles/PMC11405141/)
- [PMC — Scoping review: music for emotion regulation](https://pmc.ncbi.nlm.nih.gov/articles/PMC11428991/)
- [Morrison Foerster — NY & CA AI companion laws](https://www.mofo.com/resources/insights/251120-new-york-and-california-enact-landmark-ai)
- [Nature Machine Intelligence — Emotional risks of AI companions](https://www.nature.com/articles/s42256-025-01093-9)
- [APA Monitor — AI chatbots and emotional connection](https://www.apa.org/monitor/2026/01-02/trends-digital-ai-relationships-emotional-connection)
- [Reader's Digest — Top wellness podcasts, Spotify Wrapped 2025](https://www.rd.com/article/top-health-and-wellness-podcasts-spotify-wrapped-2025/)
