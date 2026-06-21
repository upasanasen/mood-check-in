// Need-state taxonomy (PRD §6, "Need-state classification").
//
// The taxonomy itself is easily copied; per the PRD the durable asset is the
// closed feedback loop (check-in -> "Did that help?" -> per-user weights).
// This module is the single source of truth for the five recommendable
// need-states. "Crisis" is deliberately NOT in this list — it is handled by an
// independent classifier (src/crisisDetector.js) that runs first and never
// routes into a recommendation.

export const NEED_STATES = {
  distract: {
    id: "distract",
    label: "Distract",
    want: "Stop ruminating",
    audio: "Gripping serialized podcast / audiobook / upbeat unfamiliar music",
    reason: "To take your mind off it…",
  },
  validate: {
    id: "validate",
    label: "Validate",
    want: "Feel understood",
    audio: "Mood-matched music — a 'let it out' mix",
    reason: "If you'd rather sit with it…",
  },
  calm: {
    id: "calm",
    label: "Calm",
    want: "Downregulate",
    audio: "Ambient, breathing-paced, low-tempo",
    reason: "To slow things down…",
  },
  energize: {
    id: "energize",
    label: "Energize",
    want: "Get moving again",
    audio: "High-energy familiar favorites",
    reason: "To get the energy back up…",
  },
  company: {
    id: "company",
    label: "Company",
    want: "Hear human voices",
    audio: "Warm, conversational podcasts",
    reason: "Some company in the room…",
  },
};

export const NEED_STATE_IDS = Object.keys(NEED_STATES);

// Default bucket for genuinely low-signal inputs in the deterministic baseline.
// Ambiguous emotional venting most safely maps to "feel understood".
export const DEFAULT_NEED_STATE = "validate";

// Below this model confidence the DJ asks ONE clarifying chip-question rather
// than guessing (PRD §6.1, "Low-confidence fallback"). Never more than one.
export const CONFIDENCE_THRESHOLD = 0.55;

// The single clarifying question, framed as the PRD's example
// ("Want to take your mind off it, or sit with it?").
export const CLARIFY = {
  prompt: "Want to take your mind off it, or sit with it?",
  options: [
    { label: "Take my mind off it", needState: "distract" },
    { label: "Sit with it", needState: "validate" },
  ],
};
