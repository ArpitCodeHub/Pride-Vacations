/**
 * Unit tests for the Supabase-backed api.js facade.
 *
 * Uses CRA + Jest (already wired by react-scripts). Mocks the Supabase
 * client and global.fetch. Verifies that:
 *   - All paths return the axios-shaped { data, status } envelope.
 *   - 404 mapping works for missing rows from maybeSingle().
 *   - Empty-string fields in /leads payload are coerced to null.
 *   - PATCH /admin/leads/:id returns the updated row.
 *   - POST /concierge POSTs to /api/concierge (relative URL) and propagates the parsed JSON.
 *   - HTTP 502 from /api/concierge throws with response.status === 502.
 */

// Mock the supabase module BEFORE importing api.
jest.mock("../supabase", () => {
  // Builder that records the last query for assertions, then resolves with
  // whatever the test pre-loaded.
  const state = {
    nextResults: {}, // table -> { data, error } for non-single calls
    nextSingles: {}, // table -> { data, error } for single/maybeSingle
    lastInsertPayload: null,
    lastUpdatePayload: null,
  };

  function builder(table) {
    let _select = "*";
    let _eq = null; // { col, val }
    let _orderBy = null;
    return {
      _state: state,
      select(cols) {
        _select = cols ?? "*";
        return this;
      },
      eq(col, val) {
        _eq = { col, val };
        return this;
      },
      order(col, opts) {
        _orderBy = { col, ...(opts || {}) };
        return this;
      },
      // Terminal: list / multi-row select.
      then(onFulfilled, onRejected) {
        const r = state.nextResults[table] || { data: [], error: null };
        return Promise.resolve(r).then(onFulfilled, onRejected);
      },
      async maybeSingle() {
        const r = state.nextSingles[table] || { data: null, error: null };
        return r;
      },
      async single() {
        const r = state.nextSingles[table] || {
          data: null,
          error: { code: "PGRST116", message: "Results contain 0 rows" },
        };
        return r;
      },
      insert(payload) {
        state.lastInsertPayload = payload;
        // Returning a chainable that supports .select().single()
        return {
          select() {
            return {
              async single() {
                const r = state.nextSingles[table];
                return r || { data: { id: "lead-1", ...payload }, error: null };
              },
            };
          },
        };
      },
      update(payload) {
        state.lastUpdatePayload = payload;
        return {
          eq() {
            return {
              select() {
                return {
                  async single() {
                    const r = state.nextSingles[table];
                    return r || { data: { id: "lead-1", ...payload }, error: null };
                  },
                };
              },
            };
          },
        };
      },
    };
  }

  return {
    __esModule: true,
    supabase: {
      from(table) {
        return builder(table);
      },
      __state: state,
      __reset() {
        state.nextResults = {};
        state.nextSingles = {};
        state.lastInsertPayload = null;
        state.lastUpdatePayload = null;
      },
    },
  };
});

const { supabase } = require("../supabase");
const { api } = require("../api");

beforeEach(() => {
  supabase.__reset();
  global.fetch = jest.fn();
});

afterEach(() => {
  delete global.fetch;
});

// ---------------------------------------------------------------- experiences

test("api.get('/experiences') returns { data, status: 200 }", async () => {
  supabase.__state.nextResults.experiences = {
    data: [{ id: "1", slug: "wake-above-the-clouds" }],
    error: null,
  };
  const r = await api.get("/experiences");
  expect(r.status).toBe(200);
  expect(Array.isArray(r.data)).toBe(true);
  expect(r.data[0].slug).toBe("wake-above-the-clouds");
});

test("api.get('/experiences/:slug') with no row throws response.status === 404", async () => {
  supabase.__state.nextSingles.experiences = { data: null, error: null };
  await expect(api.get("/experiences/missing-slug")).rejects.toMatchObject({
    response: { status: 404 },
  });
});

test("api.get('/experiences/:slug') returns single row with status 200", async () => {
  supabase.__state.nextSingles.experiences = {
    data: { id: "1", slug: "ocean-beyond-the-horizon" },
    error: null,
  };
  const r = await api.get("/experiences/ocean-beyond-the-horizon");
  expect(r.status).toBe(200);
  expect(r.data.slug).toBe("ocean-beyond-the-horizon");
});

// ---------------------------------------------------------------- stories

test("api.get('/stories') returns array", async () => {
  supabase.__state.nextResults.travel_stories = {
    data: [{ id: "s1", slug: "the-quiet-art-of-himalayan-mornings" }],
    error: null,
  };
  const r = await api.get("/stories");
  expect(r.status).toBe(200);
  expect(r.data.length).toBe(1);
});

test("api.get('/stories/:slug') with no row throws 404", async () => {
  supabase.__state.nextSingles.travel_stories = { data: null, error: null };
  await expect(api.get("/stories/missing")).rejects.toMatchObject({
    response: { status: 404 },
  });
});

// ---------------------------------------------------------------- leads (empty-string coercion)

test("api.post('/leads', { phone: '' }) coerces empty strings to null before insert", async () => {
  supabase.__state.nextSingles.leads_inquiries = {
    data: { id: "lead-1", phone: null, full_name: "Anika", email: "a@x.com" },
    error: null,
  };
  const r = await api.post("/leads", {
    full_name: "Anika",
    email: "a@x.com",
    phone: "",
    message: "   ",
    occasion: null,
  });
  expect(r.status).toBe(201);
  expect(supabase.__state.lastInsertPayload).toMatchObject({
    full_name: "Anika",
    email: "a@x.com",
    phone: null,
    message: null,
    occasion: null,
  });
});

// ---------------------------------------------------------------- admin

test("api.patch('/admin/leads/:id', { status }) returns the updated row", async () => {
  supabase.__state.nextSingles.leads_inquiries = {
    data: { id: "lead-1", status: "won" },
    error: null,
  };
  const r = await api.patch("/admin/leads/lead-1", { status: "won" });
  expect(r.status).toBe(200);
  expect(r.data.status).toBe("won");
  expect(supabase.__state.lastUpdatePayload).toEqual({ status: "won" });
});

test("api.get('/admin/leads') returns array", async () => {
  supabase.__state.nextResults.leads_inquiries = {
    data: [{ id: "1" }, { id: "2" }],
    error: null,
  };
  const r = await api.get("/admin/leads");
  expect(r.status).toBe(200);
  expect(r.data.length).toBe(2);
});

// ---------------------------------------------------------------- RLS / permission

test("Supabase 42501 permission error maps to response.status === 403", async () => {
  supabase.__state.nextResults.leads_inquiries = {
    data: null,
    error: { code: "42501", message: "permission denied for table leads_inquiries" },
  };
  await expect(api.get("/admin/leads")).rejects.toMatchObject({
    response: { status: 403 },
  });
});

// ---------------------------------------------------------------- concierge

test("api.post('/concierge', body) POSTs to /api/concierge (relative) and returns parsed JSON", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    async json() {
      return { conversation_id: "c1", reply: "hi", messages: [] };
    },
  });
  const r = await api.post("/concierge", { message: "hello" });
  expect(r.status).toBe(200);
  expect(r.data.conversation_id).toBe("c1");
  expect(global.fetch).toHaveBeenCalledTimes(1);
  const [url, init] = global.fetch.mock.calls[0];
  // Either '/api/concierge' (relative) or REACT_APP_BACKEND_URL + '/api/concierge'.
  expect(url.endsWith("/api/concierge")).toBe(true);
  expect(init.method).toBe("POST");
  expect(init.headers["Content-Type"]).toBe("application/json");
  expect(JSON.parse(init.body)).toEqual({ message: "hello" });
});

test("api.post('/concierge') with HTTP 502 throws with response.status === 502", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status: 502,
    async json() {
      return { error: "Concierge unavailable" };
    },
  });
  await expect(api.post("/concierge", { message: "hi" })).rejects.toMatchObject({
    response: { status: 502 },
  });
});

test("api.post('/concierge') with network error throws response.status === 502", async () => {
  global.fetch.mockRejectedValueOnce(new Error("net down"));
  await expect(api.post("/concierge", { message: "hi" })).rejects.toMatchObject({
    response: { status: 502 },
  });
});
