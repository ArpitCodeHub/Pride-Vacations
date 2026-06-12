/**
 * api.js — Supabase-backed facade with the same surface the components
 * have always used.
 *
 * Public exports kept stable so no component or page file needs to change:
 *   - `api.get(path)`, `api.post(path, body)`, `api.patch(path, body)`
 *   - Each call resolves with `{ data, status }` (axios-shaped envelope).
 *   - On failure throws an `Error` whose `response` field carries
 *     `{ status, data }` so existing `e.response?.status === 404` checks
 *     in ExperiencePage.jsx and StoryPage.jsx keep working.
 *
 * Internally each path dispatches to either:
 *   - `@supabase/supabase-js` for CRUD (replaces FastAPI + RLS gates admin),
 *   - or a relative POST to `/api/concierge` (Vercel Node serverless function).
 *
 * Auth headers are handled by the Supabase JS client itself via the
 * persisted session — no axios interceptor needed.
 */

import { supabase } from "./supabase";

// Kept for backward compatibility. After migration `/api/concierge` is
// served from the same origin as the SPA, so the relative URL is used.
// If REACT_APP_BACKEND_URL is set, it is ignored for Supabase calls and
// only used (when non-empty) as an optional override for the concierge URL.
export const API = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;

const CONCIERGE_URL = (() => {
  const base = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");
  return base ? `${base}/api/concierge` : "/api/concierge";
})();

// ---------------------------------------------------------------- helpers

function makeError(status, data) {
  const err = new Error(
    (data && (data.detail || data.error || data.message)) || `Request failed (${status})`
  );
  err.response = { status, data: data ?? null };
  return err;
}

function mapSupabaseError(error, fallbackStatus = 500) {
  if (!error) return makeError(fallbackStatus, { detail: "Unknown error" });
  // PGRST116 = "Results contain 0 rows" from a single() query.
  if (error.code === "PGRST116") {
    return makeError(404, { detail: "Not found" });
  }
  // Permission denied via RLS.
  if (
    error.code === "42501" ||
    (typeof error.message === "string" &&
      error.message.toLowerCase().includes("permission denied"))
  ) {
    return makeError(403, { detail: "Forbidden" });
  }
  return makeError(fallbackStatus, { detail: error.message || "Server error" });
}

function ok(data, status = 200) {
  return { data, status };
}

// Empty strings → null to mirror the legacy backend `empty_to_none` validator.
function nullifyEmptyStrings(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const out = {};
  for (const [k, v] of Object.entries(payload)) {
    out[k] = typeof v === "string" && v.trim() === "" ? null : v;
  }
  return out;
}

// Strip undefined values so we don't accidentally null out columns on PATCH.
function stripUndefined(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const out = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

// ---------------------------------------------------------------- handlers

async function getExperiences() {
  const { data, error } = await supabase
    .from("experiences")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw mapSupabaseError(error);
  return ok(data || []);
}

async function getExperience(slug) {
  const { data, error } = await supabase
    .from("experiences")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw mapSupabaseError(error);
  if (!data) throw makeError(404, { detail: "Experience not found" });
  return ok(data);
}

async function getStories() {
  const { data, error } = await supabase
    .from("travel_stories")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw mapSupabaseError(error);
  return ok(data || []);
}

async function getStory(slug) {
  const { data, error } = await supabase
    .from("travel_stories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw mapSupabaseError(error);
  if (!data) throw makeError(404, { detail: "Story not found" });
  return ok(data);
}

async function createLead(body) {
  const payload = nullifyEmptyStrings(body);
  const { data, error } = await supabase
    .from("leads_inquiries")
    .insert(payload)
    .select()
    .single();
  if (error) throw mapSupabaseError(error);
  return ok(data, 201);
}

async function getAdminLeads() {
  const { data, error } = await supabase
    .from("leads_inquiries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw mapSupabaseError(error);
  return ok(data || []);
}

async function updateAdminLead(id, body) {
  const payload = stripUndefined(body);
  const { data, error } = await supabase
    .from("leads_inquiries")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw mapSupabaseError(error);
  if (!data) throw makeError(404, { detail: "Lead not found" });
  return ok(data);
}

async function getAdminExperiences() {
  const { data, error } = await supabase
    .from("experiences")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw mapSupabaseError(error);
  return ok(data || []);
}

async function postConcierge(body) {
  let response;
  try {
    response = await fetch(CONCIERGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
  } catch {
    throw makeError(502, { detail: "Concierge unreachable" });
  }
  let parsed = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    throw makeError(response.status, parsed || { detail: "Concierge error" });
  }
  return ok(parsed, response.status);
}

// ---------------------------------------------------------------- router

const ADMIN_LEAD_PATCH = /^\/admin\/leads\/([^/]+)$/;
const EXPERIENCE_DETAIL = /^\/experiences\/([^/]+)$/;
const STORY_DETAIL = /^\/stories\/([^/]+)$/;

function notImplemented(method, path) {
  return makeError(404, { detail: `No handler for ${method} ${path}` });
}

async function get(path) {
  if (path === "/experiences") return getExperiences();
  if (path === "/stories") return getStories();
  if (path === "/admin/leads") return getAdminLeads();
  if (path === "/admin/experiences") return getAdminExperiences();
  let m = path.match(EXPERIENCE_DETAIL);
  if (m) return getExperience(decodeURIComponent(m[1]));
  m = path.match(STORY_DETAIL);
  if (m) return getStory(decodeURIComponent(m[1]));
  throw notImplemented("GET", path);
}

async function post(path, body) {
  if (path === "/leads") return createLead(body);
  if (path === "/concierge") return postConcierge(body);
  throw notImplemented("POST", path);
}

async function patch(path, body) {
  const m = path.match(ADMIN_LEAD_PATCH);
  if (m) return updateAdminLead(decodeURIComponent(m[1]), body);
  throw notImplemented("PATCH", path);
}

export const api = { get, post, patch };
