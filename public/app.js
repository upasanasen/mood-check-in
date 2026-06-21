// Mood Check-In — frontend.
// Plain ES module-free JS so it runs from a static folder with no build step.

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  return n;
};

// --- Local state (consent + session live in localStorage; this is a real app,
// not a sandboxed artifact, so localStorage is fine and powers the privacy demo) ---
const LS = {
  consent: "mci_consent",
  remember: "mci_remember",
  sid: "mci_sid",
};

function sessionId() {
  let s = localStorage.getItem(LS.sid);
  if (!s) {
    s = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now() + Math.random());
    localStorage.setItem(LS.sid, s);
  }
  return s;
}
function remembers() { return localStorage.getItem(LS.remember) === "1"; }

const PRESETS = [
  { emoji: "😔", label: "Down", text: "I feel really down today" },
  { emoji: "😰", label: "Stressed", text: "I'm so stressed and overwhelmed, I can't switch off" },
  { emoji: "💔", label: "Heartbroken", text: "going through a breakup, feeling heartbroken" },
  { emoji: "😶", label: "Numb", text: "I just feel numb and empty" },
  { emoji: "🥱", label: "Drained", text: "exhausted but I still need to get moving" },
  { emoji: "🫥", label: "Lonely", text: "feeling really alone tonight" },
];

const FORMAT_EMOJI = { music: "🎵", podcast: "🎙️", audiobook: "📖" };

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// --- Init -------------------------------------------------------------------
async function init() {
  renderPresets();
  wireEvents();
  refreshMode();

  if (localStorage.getItem(LS.consent) === "on") {
    showCheckIn();
  } else {
    $("#consentCard").hidden = false;
  }
}

async function refreshMode() {
  const badge = $("#modeBadge");
  try {
    const h = await api("/api/health");
    if (h.classifier === "llm") {
      badge.textContent = `live · ${h.model}`;
      badge.classList.add("llm");
    } else {
      badge.textContent = "mock classifier (no API key)";
      badge.classList.add("mock");
    }
  } catch {
    badge.textContent = "server offline";
  }
}

function renderPresets() {
  const wrap = $("#presetChips");
  wrap.innerHTML = "";
  PRESETS.forEach((p) => {
    const c = el("button", "chip");
    c.innerHTML = `<span class="emoji">${p.emoji}</span>${p.label}`;
    c.addEventListener("click", () => submitCheckIn(p.text));
    wrap.appendChild(c);
  });
}

function showCheckIn() {
  $("#consentCard").hidden = true;
  $("#checkInCard").hidden = false;
}

// --- Events -----------------------------------------------------------------
function wireEvents() {
  $("#consentAccept").addEventListener("click", () => {
    localStorage.setItem(LS.consent, "on");
    localStorage.setItem(LS.remember, $("#rememberOptIn").checked ? "1" : "0");
    sessionId();
    showCheckIn();
  });
  $("#consentDecline").addEventListener("click", () => {
    $("#consentCard").hidden = true;
    $("#result").innerHTML =
      `<div class="card"><p class="muted">No problem — Mood Check-In stays off. You can turn it on any time from Privacy.</p></div>`;
  });

  $("#submitBtn").addEventListener("click", () => submitCheckIn());
  $("#moodText").addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submitCheckIn();
  });
  $("#voiceBtn").addEventListener("click", startVoice);

  // Privacy drawer
  $("#openSettings").addEventListener("click", openDrawer);
  $("#closeSettings").addEventListener("click", closeDrawer);
  $("#drawerBackdrop").addEventListener("click", closeDrawer);
  $("#viewData").addEventListener("click", viewData);
  $("#deleteData").addEventListener("click", deleteData);
  $("#disableFeature").addEventListener("click", disableFeature);
}

// --- Core flow --------------------------------------------------------------
async function submitCheckIn(presetText, forcedNeedState) {
  const text = presetText || $("#moodText").value.trim();
  const hint = $("#checkinHint");
  if (!text) { hint.textContent = "Tell the DJ a little about how you feel."; return; }

  hint.textContent = "Thinking…";
  $("#result").innerHTML = "";

  const body = {
    text,
    exclusions: splitExclusions($("#excludeText").value),
    userLang: $("#langSel").value || null,
    country: null,
    sessionId: sessionId(),
    remember: remembers(),
  };
  if (forcedNeedState) body.needState = forcedNeedState;

  try {
    const data = await api("/api/check-in", { method: "POST", body: JSON.stringify(body) });
    hint.textContent = "";
    renderResult(data, text);
  } catch (err) {
    hint.textContent = err.message;
  }
}

function splitExclusions(s) {
  if (!s) return [];
  return s.split(/[,;]| and /i).map((x) => x.trim()).filter(Boolean);
}

function renderResult(data, originalText) {
  const root = $("#result");
  root.innerHTML = "";

  if (data.type === "crisis") return root.appendChild(renderCrisis(data));

  if (data.type === "clarify") {
    return root.appendChild(renderClarify(data, originalText));
  }

  // recommendations
  const card = el("section", "card fade-in");

  if (data.crisis && data.crisis.tier === "soft" && data.softResources) {
    card.appendChild(renderSupportStrip(data.softResources));
  }

  const head = el("div", "result-head");
  const ns = el("span", "ns");
  ns.textContent = data.needState;
  const why = el("span", "why");
  why.textContent = classificationNote(data.classification);
  head.appendChild(ns);
  head.appendChild(why);
  card.appendChild(head);

  if (data.note) {
    const n = el("p", "muted");
    n.textContent = data.note;
    card.appendChild(n);
  }

  data.offers.forEach((o) => card.appendChild(renderOffer(o)));

  if (data.excludedTags && data.excludedTags.length) {
    const ex = el("p", "muted");
    ex.style.fontSize = "13px";
    ex.textContent = `Honoring your exclusions: ${data.excludedTags.join(", ")} removed.`;
    card.appendChild(ex);
  }

  card.appendChild(renderFeedback(data.needState));
  root.appendChild(card);
}

function classificationNote(c) {
  if (!c) return "";
  if (c.source === "user-clarified") return "you chose this";
  const conf = typeof c.confidence === "number" ? ` · ${Math.round(c.confidence * 100)}% confident` : "";
  return `${c.rationale || "classified"}${conf}`;
}

function renderOffer(o) {
  const row = el("div", "offer");
  const art = el("div", "art");
  art.textContent = FORMAT_EMOJI[o.format] || "🎧";
  const meta = el("div", "meta");
  meta.innerHTML =
    `<div class="title">${escapeHtml(o.title)}</div>` +
    `<div class="creator">${escapeHtml(o.creator)} · <span class="fmt">${o.format}</span></div>` +
    `<div class="reason">${escapeHtml(o.reason)}</div>`;
  const play = el("button", "play");
  play.textContent = "▶";
  play.title = "Play (mock)";
  play.addEventListener("click", () => {
    play.textContent = "⏸";
    play.disabled = true;
    setTimeout(() => { play.textContent = "▶"; play.disabled = false; }, 1200);
  });
  row.appendChild(art);
  row.appendChild(meta);
  row.appendChild(play);
  return row;
}

function renderClarify(data, originalText) {
  const card = el("section", "card clarify fade-in");
  if (data.crisis && data.crisis.tier === "soft" && data.softResources) {
    card.appendChild(renderSupportStrip(data.softResources));
  }
  const q = el("div", "q");
  q.textContent = data.clarify.prompt;
  card.appendChild(q);
  const chips = el("div", "chips");
  data.clarify.options.forEach((opt) => {
    const c = el("button", "chip");
    c.textContent = opt.label;
    c.addEventListener("click", () => submitCheckIn(originalText, opt.needState));
    chips.appendChild(c);
  });
  card.appendChild(chips);
  return card;
}

function renderCrisis(data) {
  const card = el("section", "card crisis fade-in");
  if (data.reviewStatus) {
    const flag = el("span", "review-flag");
    flag.textContent = `Crisis copy status: ${data.reviewStatus}`;
    card.appendChild(flag);
  }
  const h = el("h2");
  h.textContent = data.copy?.heading || "You deserve real support";
  const body = el("p", "body");
  body.textContent = data.copy?.body || "";
  const ai = el("p", "ai");
  ai.textContent = data.copy?.aiDisclosure || data.aiDisclosure || "";
  card.appendChild(h);
  card.appendChild(body);
  card.appendChild(ai);

  (data.resources || []).forEach((r) => card.appendChild(renderResource(r)));

  const note = el("p", "muted");
  note.style.fontSize = "13px";
  note.textContent = "No playlist is shown here by design — the right response to a crisis signal is help, not audio. (PRD P0-3)";
  card.appendChild(note);
  return card;
}

function renderResource(r) {
  const row = el("div", "resource");
  const meta = el("div");
  meta.style.flex = "1";
  if (r.type === "url") {
    meta.innerHTML =
      `<div class="r-label">${escapeHtml(r.label)}</div>` +
      `<a href="${encodeURI(r.value)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.value)}</a>` +
      (r.note ? `<div class="r-note">${escapeHtml(r.note)}</div>` : "");
  } else {
    meta.innerHTML =
      `<div class="r-label">${escapeHtml(r.label)}</div>` +
      `<div class="r-val">${escapeHtml(r.value)}</div>` +
      (r.note ? `<div class="r-note">${escapeHtml(r.note)}</div>` : "");
  }
  row.appendChild(meta);
  return row;
}

function renderSupportStrip(resources) {
  const strip = el("div", "support-strip");
  const url = (resources.resources || []).find((r) => r.type === "url");
  strip.innerHTML =
    `<span>💛</span><span>That sounds heavy. Support is here if you want it — ` +
    (url ? `<a href="${encodeURI(url.value)}" target="_blank" rel="noopener noreferrer">find a helpline</a>` : "reach out to someone you trust") +
    `. Music can sit alongside that, not instead of it.</span>`;
  return strip;
}

function renderFeedback(needState) {
  const wrap = el("div", "feedback");
  const label = el("span");
  label.textContent = "Did that help?";
  const up = el("button");
  up.textContent = "👍";
  const down = el("button");
  down.textContent = "👎";
  const done = el("span");
  async function send(helpful) {
    up.disabled = down.disabled = true;
    try {
      await api("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ helpful, needState, sessionId: sessionId() }),
      });
      done.textContent = helpful ? " Thanks — noted." : " Thanks — we'll tune it.";
    } catch { done.textContent = " (couldn't save feedback)"; }
  }
  up.addEventListener("click", () => send(true));
  down.addEventListener("click", () => send(false));
  wrap.appendChild(label);
  wrap.appendChild(up);
  wrap.appendChild(down);
  wrap.appendChild(done);
  return wrap;
}

// --- Voice ------------------------------------------------------------------
function startVoice() {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) {
    $("#checkinHint").textContent = "Voice uses the DJ voice prompt in production. (Your browser has no speech API.)";
    return;
  }
  const rec = new Rec();
  rec.lang = $("#langSel").value === "es" ? "es-ES" : $("#langSel").value === "de" ? "de-DE" : "en-US";
  rec.interimResults = false;
  $("#checkinHint").textContent = "Listening…";
  rec.onresult = (e) => {
    $("#moodText").value = e.results[0][0].transcript;
    $("#checkinHint").textContent = "";
  };
  rec.onerror = () => { $("#checkinHint").textContent = "Didn't catch that."; };
  rec.start();
}

// --- Privacy drawer ---------------------------------------------------------
function openDrawer() { $("#settingsDrawer").hidden = false; $("#drawerBackdrop").hidden = false; }
function closeDrawer() { $("#settingsDrawer").hidden = true; $("#drawerBackdrop").hidden = true; $("#dataView").hidden = true; }

async function viewData() {
  const view = $("#dataView");
  view.hidden = false;
  view.textContent = "Loading…";
  try {
    const data = await api(`/api/data?sid=${encodeURIComponent(sessionId())}`);
    view.textContent = data.entries.length
      ? JSON.stringify(data.entries, null, 2)
      : "No mood history stored. (Either you haven't opted into memory, or it's been deleted.)";
  } catch (e) { view.textContent = e.message; }
}

async function deleteData() {
  try {
    await api(`/api/data?sid=${encodeURIComponent(sessionId())}`, { method: "DELETE" });
    $("#dataView").hidden = false;
    $("#dataView").textContent = "Deleted. Your mood history is gone.";
  } catch (e) { $("#dataView").hidden = false; $("#dataView").textContent = e.message; }
}

async function disableFeature() {
  await deleteData();
  localStorage.setItem(LS.consent, "off");
  closeDrawer();
  $("#checkInCard").hidden = true;
  $("#result").innerHTML =
    `<div class="card"><p class="muted">Mood Check-In is off and your history was deleted. Reload and accept consent to turn it back on.</p></div>`;
}

// --- utils ------------------------------------------------------------------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

init();
