// Retrieval / recommendation (PRD §6 "Retrieval" + P0-5 + P0-8).
//
// v1 deliberately does NOT invent a new recommender. Each need-state maps to a
// curated candidate pool (here: data/catalog.json, a mock of the editorially
// maintained pools), which is then filtered by exclusion rules and language and
// assembled into 2-3 OFFERS — never a single prescribed answer (PRD §6, "Offer,
// don't prescribe"). We also add one contrasting option from a complementary
// need-state so the user chooses how to cope ("take your mind off it" vs "sit
// with it").

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { NEED_STATES } from "./needStates.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG = JSON.parse(
  readFileSync(join(__dirname, "../data/catalog.json"), "utf8")
);

// Complementary need-state for the "contrast" offer.
const CONTRAST = {
  distract: "validate",
  validate: "distract",
  calm: "energize",
  energize: "calm",
  company: "validate",
};

// Free-text exclusion phrases -> catalog tags.
const TAG_SYNONYMS = {
  romantic: ["romantic", "romance", "love song", "love songs", "romántic", "romantica", "romántico", "romanticas", "liebes", "liebeslieder", "amor", "canciones de amor"],
  explicit: ["explicit", "swearing", "profanity", "palabrotas"],
  sad: ["sad", "depressing", "melancholy", "triste", "traurig"],
  "true-crime": ["true crime", "true-crime", "crime", "murder", "crimen", "asesinato"],
  upbeat: ["upbeat", "happy", "hype"],
};

function exclusionTags(exclusions) {
  const list = Array.isArray(exclusions)
    ? exclusions
    : exclusions
    ? [exclusions]
    : [];
  const text = list.join(" ").toLowerCase();
  const tags = new Set();
  for (const [tag, syns] of Object.entries(TAG_SYNONYMS)) {
    if (syns.some((s) => text.includes(s)) || text.includes(tag)) tags.add(tag);
  }
  return tags;
}

function allowed(item, excludedTags) {
  return !item.tags.some((t) => excludedTags.has(t));
}

function languageRank(item, userLang) {
  if (userLang && item.languages.includes(userLang)) return 0;
  if (item.languages.includes("instrumental")) return 1;
  if (item.languages.includes("en")) return 2;
  return 3;
}

function poolFor(needState, excludedTags, userLang) {
  return CATALOG.items
    .filter((i) => i.needStates.includes(needState) && allowed(i, excludedTags))
    .sort((a, b) => languageRank(a, userLang) - languageRank(b, userLang));
}

function toOffer(item, needState, reason) {
  return {
    id: item.id,
    title: item.title,
    creator: item.creator,
    format: item.format,
    needState,
    needStateLabel: NEED_STATES[needState]?.label || needState,
    reason,
    tags: item.tags,
  };
}

/**
 * Build 2-3 offers for a classified need-state.
 * @param {string} needState
 * @param {object} opts  { exclusions, userLang }
 * @returns {{offers:Array, excludedTags:string[], note?:string}}
 */
export function recommend(needState, { exclusions, userLang } = {}) {
  const excludedTags = exclusionTags(exclusions);
  const primaryPool = poolFor(needState, excludedTags, userLang);

  const offers = [];
  const usedFormats = new Set();

  // 1-2 from the primary need-state, preferring format diversity (P0-5).
  for (const item of primaryPool) {
    if (offers.length >= 2) break;
    if (offers.length === 1 && usedFormats.has(item.format)) continue;
    offers.push(toOffer(item, needState, NEED_STATES[needState].reason));
    usedFormats.add(item.format);
  }
  // If diversity skipped everything, take the top primary item regardless.
  if (offers.length === 0 && primaryPool.length) {
    offers.push(toOffer(primaryPool[0], needState, NEED_STATES[needState].reason));
    usedFormats.add(primaryPool[0].format);
  }

  // One contrasting option so the user picks how to cope.
  const contrastState = CONTRAST[needState];
  if (contrastState) {
    const contrastPool = poolFor(contrastState, excludedTags, userLang).filter(
      (i) => !offers.some((o) => o.id === i.id)
    );
    const pick =
      contrastPool.find((i) => !usedFormats.has(i.format)) || contrastPool[0];
    if (pick) offers.push(toOffer(pick, contrastState, NEED_STATES[contrastState].reason));
  }

  const result = { offers: offers.slice(0, 3), excludedTags: [...excludedTags] };
  if (result.offers.length === 0) {
    result.note =
      "Everything in this need-state was filtered out by your exclusions. Try loosening them.";
  }
  return result;
}
