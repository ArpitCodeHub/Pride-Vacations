/**
 * Pride Vacations — AI Concierge (Vercel Node serverless function)
 *
 * Replaces the legacy FastAPI /api/concierge route. Same model, same
 * system prompt, same response shape. Conversation history persists
 * to a Supabase Postgres table (`conversations`) instead of MongoDB.
 *
 * Secrets (OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL)
 * are read from server-side env vars only and never returned to the
 * client or echoed in logs.
 */

const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");
const { randomUUID } = require("crypto");

const SYSTEM_PROMPT = `You are the Pride Vacations Concierge — a warm, refined luxury travel curator.
Pride Vacations is a boutique travel atelier crafting cinematic, deeply personal escapes across India and beyond — mountain retreats, beach sanctuaries, heritage palaces, jungle hideaways, and wellness journeys.

Voice: editorial, evocative, never salesy. Speak like a luxury magazine.
Style: short paragraphs, sensory language, suggest 2-3 thoughtful options.
Always end by offering to connect them to a human travel designer or to refine the brief.
Never invent specific prices or real-time availability. Politely decline non-travel questions and redirect.
Keep replies under 160 words.`;

// Lazy singletons — initialized on first request after env vars are validated.
let _supabase = null;
let _openai = null;

function getClients() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
    // Generic message — never leak which variable is missing.
    const err = new Error("Server misconfigured");
    err.code = "MISCONFIGURED";
    throw err;
  }
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  if (!_openai) {
    _openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  }
  return { supabase: _supabase, openai: _openai };
}

async function readJsonBody(req) {
  // Vercel auto-parses JSON when Content-Type is application/json, but
  // fall back to manual parse for safety / local dev.
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return await new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve(null);
      }
    });
    req.on("error", () => resolve(null));
  });
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  let clients;
  try {
    clients = getClients();
  } catch (e) {
    if (e.code === "MISCONFIGURED") {
      return sendJson(res, 500, { error: "Server misconfigured" });
    }
    return sendJson(res, 500, { error: "Server error" });
  }
  const { supabase, openai } = clients;

  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") {
    return sendJson(res, 400, { error: "Invalid JSON body" });
  }

  const message = typeof body.message === "string" ? body.message : "";
  if (!message || message.trim() === "") {
    return sendJson(res, 400, { error: "message is required" });
  }

  const conversationId =
    typeof body.conversation_id === "string" && body.conversation_id.trim() !== ""
      ? body.conversation_id
      : randomUUID();

  // Load prior history (if any).
  let history = [];
  if (typeof body.conversation_id === "string" && body.conversation_id.trim() !== "") {
    const { data, error } = await supabase
      .from("conversations")
      .select("messages")
      .eq("conversation_id", conversationId)
      .maybeSingle();
    if (error && error.code !== "PGRST116") {
      // Persistence failure during history load — fall back to empty history
      // rather than dropping the request. The concierge stays responsive even
      // if Supabase is briefly degraded; the new turn just may not include
      // prior context. (Failure here does NOT leak secrets.)
      history = [];
    } else if (data && Array.isArray(data.messages)) {
      history = data.messages;
    }
  }

  // Compose prompt: system + prior turns + new user message.
  const promptMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  let reply;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      max_tokens: 400,
      messages: promptMessages,
    });
    reply = (completion.choices?.[0]?.message?.content || "").trim();
  } catch (e) {
    // Do NOT persist a partial turn on OpenAI failure.
    return sendJson(res, 502, { error: "Concierge unavailable" });
  }

  if (!reply) {
    return sendJson(res, 502, { error: "Concierge returned empty reply" });
  }

  const now = new Date().toISOString();
  const newHistory = history.concat([
    { role: "user", content: message, ts: now },
    { role: "assistant", content: reply, ts: now },
  ]);

  // Upsert by conversation_id so re-using an id appends to the existing row.
  const { error: upsertError } = await supabase
    .from("conversations")
    .upsert(
      {
        conversation_id: conversationId,
        messages: newHistory,
        updated_at: now,
      },
      { onConflict: "conversation_id" }
    );
  if (upsertError) {
    // Reply was successful — return it even if persistence failed, so the
    // user sees the answer. The next turn will start without prior context.
    return sendJson(res, 200, {
      conversation_id: conversationId,
      reply,
      messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
    });
  }

  return sendJson(res, 200, {
    conversation_id: conversationId,
    reply,
    messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
  });
}

module.exports = handler;
module.exports.default = handler;
