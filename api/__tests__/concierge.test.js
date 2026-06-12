/**
 * Smoke tests for api/concierge.js
 *
 * Uses Node's built-in `node --test` runner so no extra dev deps are needed.
 * Mocks @supabase/supabase-js and openai by injecting them via the require
 * cache before requiring the handler. Exercises:
 *   (a) POST with empty `message` returns 400 and never calls OpenAI.
 *   (b) GET returns 405.
 *   (c) Missing env var returns 500 with no leaked variable name.
 *   (d) Successful path persists a turn and returns the expected shape.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

// ---------------------------------------------------------------- mock state

const mockState = {
  openaiCalls: 0,
  supabaseCalls: { select: 0, upsert: 0 },
  conversationsTable: new Map(), // conversation_id -> row
  nextOpenAIReply: "A warm reply from the concierge.",
  openaiShouldThrow: false,
  selectShouldError: null,
  upsertShouldError: null,
};

function resetMocks() {
  mockState.openaiCalls = 0;
  mockState.supabaseCalls = { select: 0, upsert: 0 };
  mockState.conversationsTable = new Map();
  mockState.nextOpenAIReply = "A warm reply from the concierge.";
  mockState.openaiShouldThrow = false;
  mockState.selectShouldError = null;
  mockState.upsertShouldError = null;
}

// Fake Supabase client minimal enough for the handler.
function makeFakeSupabase() {
  return {
    from(table) {
      assert.equal(table, "conversations");
      return {
        select() {
          mockState.supabaseCalls.select += 1;
          let _eqValue;
          const chain = {
            eq(_col, value) {
              _eqValue = value;
              return chain;
            },
            async maybeSingle() {
              if (mockState.selectShouldError) {
                return { data: null, error: mockState.selectShouldError };
              }
              const row = mockState.conversationsTable.get(_eqValue);
              return { data: row || null, error: null };
            },
          };
          return chain;
        },
        async upsert(row /*, options */) {
          mockState.supabaseCalls.upsert += 1;
          if (mockState.upsertShouldError) {
            return { error: mockState.upsertShouldError };
          }
          mockState.conversationsTable.set(row.conversation_id, row);
          return { error: null };
        },
      };
    },
  };
}

// Fake OpenAI client.
class FakeOpenAI {
  constructor() {
    this.chat = {
      completions: {
        create: async () => {
          mockState.openaiCalls += 1;
          if (mockState.openaiShouldThrow) {
            throw new Error("openai down");
          }
          return {
            choices: [{ message: { content: mockState.nextOpenAIReply } }],
          };
        },
      },
    };
  }
}

// ---------------------------------------------------------------- module loader override

const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;

const FAKE_MODULES = new Map();
FAKE_MODULES.set("@supabase/supabase-js", { createClient: () => makeFakeSupabase() });
FAKE_MODULES.set("openai", FakeOpenAI);

Module._load = function (request, parent, ...rest) {
  if (FAKE_MODULES.has(request)) {
    return FAKE_MODULES.get(request);
  }
  return originalLoad.call(this, request, parent, ...rest);
};

// ---------------------------------------------------------------- helpers

function loadHandler() {
  // Fresh require of the handler so internal singletons are reset between tests.
  const handlerPath = path.resolve(__dirname, "..", "concierge.js");
  delete require.cache[require.resolve(handlerPath)];
  return require(handlerPath);
}

function setEnvComplete() {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-fake";
  process.env.OPENAI_API_KEY = "openai-fake";
}

function clearEnv() {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.OPENAI_API_KEY;
}

function makeReq({ method = "POST", body = undefined } = {}) {
  return { method, body };
}

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    payload: undefined,
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
    end(text) {
      try {
        this.payload = JSON.parse(text);
      } catch {
        this.payload = text;
      }
    },
  };
}

// ---------------------------------------------------------------- tests

test("(a) POST with empty message returns 400 and does not call OpenAI", async () => {
  resetMocks();
  setEnvComplete();
  const handler = loadHandler();
  const req = makeReq({ method: "POST", body: { message: "" } });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(mockState.openaiCalls, 0);
  assert.match(res.payload.error || "", /message/i);
});

test("(b) GET returns 405", async () => {
  resetMocks();
  setEnvComplete();
  const handler = loadHandler();
  const req = makeReq({ method: "GET" });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 405);
  assert.equal(mockState.openaiCalls, 0);
});

test("(c) Missing env var returns 500 with generic message and no var-name leak", async () => {
  resetMocks();
  clearEnv();
  const handler = loadHandler();
  const req = makeReq({ method: "POST", body: { message: "hi" } });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 500);
  const errorText = JSON.stringify(res.payload || "");
  assert.doesNotMatch(errorText, /OPENAI_API_KEY/i);
  assert.doesNotMatch(errorText, /SERVICE_ROLE/i);
  assert.doesNotMatch(errorText, /SUPABASE_URL/i);
  assert.equal(mockState.openaiCalls, 0);
});

test("(d) Successful POST persists a turn and returns the expected shape", async () => {
  resetMocks();
  setEnvComplete();
  const handler = loadHandler();
  const req = makeReq({
    method: "POST",
    body: { conversation_id: null, message: "I want a Himalayan retreat." },
  });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(mockState.openaiCalls, 1);
  assert.equal(mockState.supabaseCalls.upsert, 1);
  assert.ok(res.payload.conversation_id);
  assert.equal(typeof res.payload.reply, "string");
  assert.ok(Array.isArray(res.payload.messages));
  assert.equal(res.payload.messages.length, 2);
  assert.deepEqual(res.payload.messages.map((m) => m.role), ["user", "assistant"]);
  // Persisted row exists.
  const persisted = mockState.conversationsTable.get(res.payload.conversation_id);
  assert.ok(persisted, "row should be upserted");
  assert.equal(persisted.messages.length, 2);
});

test("(d2) Subsequent POST with same conversation_id appends and includes prior turns", async () => {
  resetMocks();
  setEnvComplete();
  const handler = loadHandler();

  // Turn 1
  let res1 = makeRes();
  await handler(
    makeReq({ method: "POST", body: { conversation_id: null, message: "hello" } }),
    res1
  );
  assert.equal(res1.statusCode, 200);
  const convId = res1.payload.conversation_id;

  // Turn 2 — reuse id
  mockState.nextOpenAIReply = "Second reply.";
  let res2 = makeRes();
  await handler(
    makeReq({ method: "POST", body: { conversation_id: convId, message: "and beach options?" } }),
    res2
  );
  assert.equal(res2.statusCode, 200);
  assert.equal(res2.payload.conversation_id, convId);
  // History grew from 2 to 4.
  assert.equal(res2.payload.messages.length, 4);
  // History was loaded (select was called on the second turn).
  assert.equal(mockState.supabaseCalls.select, 1);
});

test("(e) OpenAI failure returns 502 and does not persist a partial turn", async () => {
  resetMocks();
  setEnvComplete();
  mockState.openaiShouldThrow = true;
  const handler = loadHandler();
  const req = makeReq({ method: "POST", body: { message: "hello" } });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 502);
  assert.equal(mockState.supabaseCalls.upsert, 0);
});

// ---------------------------------------------------------------- restore loader

test.after(() => {
  Module._load = originalLoad;
  Module._resolveFilename = originalResolve;
});
