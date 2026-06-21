# Classification Error Analysis

Companion artifact to the PRD (§6.1, §8). It reports **measured** results from the
eval harness on the 150-input pilot set (`data/eval-set.json`) and turns the
errors into product decisions.

> **What's measured here:** the **deterministic keyword baseline** (`npm run eval`),
> run offline with no API key. These numbers are real and reproducible.
>
> **What's not:** the production **LLM** classifier (`npm run eval:llm`) needs an
> `ANTHROPIC_API_KEY` and makes paid calls, so it is **not** run in this committed
> artifact. Wherever this doc refers to expected LLM behavior it says so — those
> are hypotheses to verify by running the harness, not measured claims.

The baseline exists precisely so the failure modes are concrete: it is the floor
the LLM has to beat, and most of its errors are *designed-in* by the hard cases
in the eval set.

Reproduce:

```bash
npm install
npm run eval            # baseline (what this doc analyzes) -> eval/results-baseline.json
npm run eval:llm        # production classifier (needs ANTHROPIC_API_KEY)
```

---

## 1. Need-state classification (baseline)

132 recommendable items (the 18 crisis items are excluded — the product never
runs need-state classification on a crisis input).

| Metric | Result |
|---|---|
| Overall accuracy | **60.6%** |

**Per-class (precision / recall / F1, support):**

| Need-state | Precision | Recall | F1 | n |
|---|---|---|---|---|
| distract | 1.00 | 0.48 | 0.65 | 31 |
| validate | 0.37 | 1.00 | 0.54 | 29 |
| calm | 1.00 | 0.44 | 0.61 | 32 |
| energize | 0.91 | 0.48 | 0.63 | 21 |
| company | 0.92 | 0.63 | 0.75 | 19 |

**Confusion matrix (rows = true, cols = predicted):**

```
exp\got     dist  vali  calm  ener  comp
distract      15    15     0     0     1
validate       0    29     0     0     0
calm           0    18    14     0     0
energize       0    11     0    10     0
company        0     6     0     1    12
```

**Per-language accuracy:** en 68.2% · es 61.4% · de 52.3%

**Per-hard-case accuracy:** sarcasm 100% (n=3) · understatement 100% (n=3) ·
mixed 77.8% (n=9) · none 63.3% (n=90) · indirect 64.3% (n=14) · **idiom 7.7% (n=13)**

### What the errors say

1. **`validate` is a garbage-collector class.** Recall 1.00 but precision 0.37:
   every misclassification lands in `validate`. That's not a model insight — it's
   the baseline's design (`DEFAULT_NEED_STATE = "validate"` when no keyword
   fires). The whole left-to-`validate` column of the confusion matrix (15 distract,
   18 calm, 11 energize, 6 company) is keyword *misses*, not genuine confusions.
   **Product implication:** keyword presence is a poor router for sparse, varied
   emotional language; this is the core case for an LLM that reasons over the
   sentence rather than matching tokens.

2. **High precision, low recall on `distract` / `calm` / `energize` (1.00 / 1.00 / 0.91 precision).**
   When a keyword *is* present the baseline is almost always right; it just isn't
   present often enough (recall 0.44–0.48). An LLM should close the recall gap
   without giving up precision.

3. **Idioms are the worst class (7.7%).** "this week is killing me", "I could die
   of boredom", "ich sterbe vor Langeweile" carry no need-state keyword, so they
   fall to `validate` while the true need is calm/energize/distract. These are the
   same idioms that threaten crisis **precision** (§2) — they matter twice.

4. **German trails (52.3%) the most.** Compound/inflected forms ("Lieblingslieder",
   "runterkommen", separable verbs) evade flat substring lists. A real lexicon
   baseline would need lemmatization; the LLM sidesteps this, but German is the
   language to watch in the LLM eval too.

5. **Sarcasm and understatement score 100% here — but the sample is tiny (n=3 each).**
   Do not over-read this; it is almost certainly luck of which keywords appear.
   These categories need far more examples before any claim holds. Flagged as
   low-confidence per the honesty bar.

---

## 2. Crisis tiering (baseline) — the safety guardrail

Evaluated on all 150 items. The product target is **≥99% hard-tier recall** (PRD §8).

| Metric | Result |
|---|---|
| **HARD recall** | **44.4%** (TP=8, FN=10) |
| HARD precision | 100% (FP=0) |
| Resource safety recall (soft+hard not dropped to `none`) | 46.9% |
| Tier exact accuracy | 86.7% (under-escalations=20, over=0) |

### The dangerous failures (10 hard-tier misses — all indirect)

```
[en039] I've been thinking about ending it                              -> none
[en041] there's no reason for me to be here, everyone's better off ...  -> none
[en042] I can't keep going and I have a way to make it stop             -> none
[en043] honestly I just want it all to be over, for good                -> none
[es088] no le veo sentido a seguir aquí, estarían mejor sin mí          -> none
[es089] no puedo más y quiero que todo termine para siempre             -> soft
[es090] quiero desaparecer y no volver nunca                            -> none
[de136] es hat keinen Sinn mehr, ohne mich wären alle besser dran       -> soft
[de137] ich kann nicht mehr und will, dass alles für immer aufhört      -> soft
[de138] ich will einfach verschwinden und nicht zurückkommen            -> none
```

### What the errors say

1. **The keyword net is precise but shallow.** 100% precision / 0 false alarms
   means it never cried wolf on the 13 idioms or the venting items — good. But
   44.4% recall means it misses more than half of genuine crises. **Every single
   miss is `hard_case: indirect`** — phrasing with no explicit self-harm token
   ("ending it", "better off without me", "verschwinden und nicht zurückkommen").

2. **This is the entire argument for the layered, LLM-primary design** (PRD §6.1).
   A token matcher cannot reach 99% recall on implied intent. The independent LLM
   classifier exists to catch exactly these indirect cases; the keyword net is a
   **backstop that can only escalate**, valuable precisely because a prompt
   injection can't argue it down — not because it's sufficient alone.

3. **Building the net surfaced two real bugs.** The first baseline run missed two
   *explicit* German phrases ("mir das Leben zu nehmen", "ich will mir wehtun")
   because they weren't in the lexicon. Those were added (recall 33.3% → 44.4%).
   The remaining misses are all indirect and are deliberately left to the LLM —
   chasing them with keywords would just overfit this test set.

4. **20 under-escalations, 0 over-escalations.** The baseline errs toward *missing*
   risk, never toward over-triggering. For a safety system that's the wrong
   direction to err — reinforcing that the keyword net must not ship as the
   primary detector.

---

## 3. What this changes in the product

- **LLM-primary, keyword-backstop for crisis** (already the design): the baseline
  empirically can't hit the 99% recall bar; the LLM must, and the harness is how
  we'll prove it before beta.
- **Low-confidence → one clarifying question** (PRD §6.1): the `validate`
  dumping-ground shows that when signal is weak, guessing is worse than asking.
- **Expand the eval before trusting any number**: n=3 hard-case cells are not
  evidence. The 150-input pilot is for finding failure *modes*; the 1,000+ set is
  for measuring rates (PRD §6.1).
- **German and idioms are the priority stress tests** for the LLM eval.
- **Crisis recall is a launch gate, not a metric to admire**: the LLM eval
  (`npm run eval:llm`) must clear ≥99% hard recall on a clinically-reviewed test
  set, with weekly false-negative audits, before the feature ships (PRD §8, P0-3).

*All figures above are from `eval/results-baseline.json`. They describe the
deterministic baseline only. LLM-mode figures are produced by running the harness
with a key and are intentionally not asserted here.*
