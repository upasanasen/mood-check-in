// LLM provider abstraction.
//
// The product path uses the Anthropic API (chosen build option: "Real LLM via
// API"). The key is read from the environment and used SERVER-SIDE ONLY — it is
// never sent to the browser. Swapping providers means changing only this file.
//
// MOCK_LLM=1 short-circuits the network entirely and uses the caller-supplied
// deterministic stub (we wire the keyword baseline in as the stub). That keeps
// the whole app runnable for demos/CI without a key. Default is the real API.

// Anthropic SDK is imported lazily (dynamic import) so that the offline
// baseline / mock paths — and the eval harness in baseline mode — run with zero
// dependencies installed and no key present.

const MODEL = process.env.LLM_MODEL || "claude-haiku-4-5-20251001";
const MOCK = process.env.MOCK_LLM === "1";

let client = null;

async function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key, " +
        "or set MOCK_LLM=1 to run without an API."
    );
  }
  if (!client) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export function isMock() {
  return MOCK;
}

export function modelName() {
  return MOCK ? "mock" : MODEL;
}

/**
 * Single-turn completion. Returns the model's raw text output.
 *
 * @param {object}   opts
 * @param {string}   opts.system       System prompt.
 * @param {string}   opts.user         User content.
 * @param {number}   [opts.maxTokens]  Token cap (classification is tiny).
 * @param {number}   [opts.temperature]
 * @param {function} [opts.mockFn]     (userText) => string, used when MOCK_LLM=1.
 * @returns {Promise<string>}
 */
export async function complete({
  system,
  user,
  maxTokens = 256,
  temperature = 0,
  mockFn,
}) {
  if (MOCK) {
    return typeof mockFn === "function" ? mockFn(user) : "";
  }
  const c = await getClient();
  const resp = await c.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: [{ role: "user", content: user }],
  });
  return resp.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
}

/** Parse a JSON object out of an LLM response, tolerating code fences / prose. */
export function parseJSONObject(text) {
  if (!text) return null;
  // Strip ```json fences if present.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}
