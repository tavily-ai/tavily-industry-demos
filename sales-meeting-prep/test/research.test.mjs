import test from "node:test";
import assert from "node:assert/strict";
import config from "../demo.config.mjs";
import { research, validateInput, buildPlan, safeUrl } from "../server/research.mjs";
import { createApp } from "../server/index.mjs";
import { consumeSSE } from "../src/stream.mjs";
import { markdown } from "../src/export.mjs";

const input = validateInput({ ...config.examples[0].input, timeRange: config.defaultTimeRange });
const fakeSearch = async () =>
  Response.json({
    answer: "A source-backed summary.",
    results: [
      {
        title: "Official update",
        url: "https://example.org/update",
        content: "An example source excerpt.",
        score: 0.9,
        favicon: "https://example.org/favicon.ico",
      },
      { title: "Duplicate", url: "https://example.org/update", content: "Duplicate." },
      { title: "Unsafe", url: "javascript:alert(1)", content: "Unsafe." },
    ],
    usage: { credits: 2 },
  });

test("all example inputs produce focused advanced requests for each lane", () => {
  for (const example of config.examples) {
    const plan = buildPlan(validateInput({ ...example.input, timeRange: "month" }));
    assert.equal(plan.length, config.lanes.length);
    for (const lane of plan) {
      assert.ok(lane.request.query.length > 0);
      assert.equal(lane.request.search_depth, "advanced");
      assert.equal(lane.request.max_results, 10);
      assert.equal(lane.request.include_favicon, true);
      assert.ok(!("include_domains" in lane.request));
    }
  }
});

test("untrusted and oversized inputs are rejected without echoing credentials", () => {
  assert.throws(() => validateInput(null));
  assert.throws(() => validateInput({ ...input, [config.fields[0].id]: "" }));
  assert.throws(() => validateInput({ ...input, [config.fields[0].id]: "a".repeat(300) }));
  assert.throws(() => validateInput({ ...input, timeRange: "century" }));
  assert.equal(validateInput({ ...input, apiKey: "secret" }).apiKey, undefined);
});

test("searches execute concurrently and emit real completions", async () => {
  let active = 0;
  let maxActive = 0;
  const events = [];
  const fetchImpl = async (url, options) => {
    active++;
    maxActive = Math.max(maxActive, active);
    assert.equal(url, "https://api.tavily.com/search");
    assert.equal(options.headers.Authorization, "Bearer test-secret");
    const body = JSON.parse(options.body);
    assert.equal(body.apiKey, undefined);
    assert.equal(body.include_favicon, true);
    await new Promise((resolve) => setTimeout(resolve, 10));
    active--;
    return fakeSearch();
  };
  const report = await research(input, {
    apiKey: "test-secret",
    fetchImpl,
    emit: (event) => events.push(event),
  });
  assert.equal(maxActive, config.lanes.length);
  assert.equal(report.status, "complete");
  assert.ok(report.sourceCount >= 1);
  assert.equal(report.credits, 2 * config.lanes.length);
  assert.equal(events.filter((event) => event.type === "result").length, config.lanes.length);
  assert.ok(report.sections.every((section) => section.sources.length === 1));
  assert.equal(report.sections[0].sources[0].favicon, "https://example.org/favicon.ico");
  assert.ok(!JSON.stringify(report).includes("test-secret"));
  assert.ok(!markdown(report).includes("test-secret"));
  assert.match(markdown(report), /https:\/\/.+\/update/);
});

test("partial upstream failures keep successful sources and sanitize API errors", async () => {
  let count = 0;
  const report = await research(input, {
    apiKey: "test-secret",
    fetchImpl: async () =>
      ++count === 2 ? new Response("test-secret", { status: 429 }) : fakeSearch(),
  });
  assert.equal(report.status, "partial");
  assert.equal(report.sections.filter((section) => section.status === "error").length, 1);
  assert.ok(
    report.sections.find((section) => section.status === "error").error.includes("credit limit"),
  );
  assert.ok(!JSON.stringify(report).includes("test-secret"));
  assert.equal(report.credits, 4);
});

test("all upstream failures cannot appear as a successful brief", async () => {
  const report = await research(input, {
    apiKey: "key",
    fetchImpl: async () => new Response("", { status: 401 }),
  });
  assert.equal(report.status, "failed");
  assert.equal(report.sourceCount, 0);
  assert.equal(report.credits, null);
});

test("empty results do not produce a free-floating answer", async () => {
  const report = await research(input, {
    apiKey: "key",
    fetchImpl: async () => Response.json({ answer: "Unsupported", results: [] }),
  });
  assert.ok(report.sections.every((section) => section.summary === null));
  assert.equal(report.sourceCount, 0);
});

test("cancellation propagates instead of reporting success", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() =>
    research(input, {
      apiKey: "key",
      signal: controller.signal,
      fetchImpl: async (url, { signal }) => {
        signal.throwIfAborted();
      },
    }),
  );
});

test("only web source URLs are allowed", () => {
  assert.equal(safeUrl("file:///etc/passwd"), null);
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl("https://example.org/"), "https://example.org/");
});

test("stream parser handles arbitrary byte splits and reports truncated streams", async () => {
  const bytes = new TextEncoder().encode(
    ': keepalive\n\ndata: {"type":"result","message":"café"}\n\ndata: {"type":"complete"}\n\n',
  );
  const response = new Response(
    new ReadableStream({
      start(controller) {
        for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
        controller.close();
      },
    }),
  );
  const events = [];
  await consumeSSE(response, (event) => events.push(event));
  assert.equal(events[0].message, "café");
  assert.equal(events.length, 2);
  await assert.rejects(
    () => consumeSSE(new Response('data: {"type":"result"}\n\n'), () => {}),
    /before the brief finished/,
  );
  await assert.rejects(
    () => consumeSSE(Response.json({ error: "Missing key" }, { status: 401 }), () => {}),
    /Missing key/,
  );
});

test("HTTP API validates inputs, rejects cross-origin use, and streams a finished report", async (t) => {
  const app = createApp({ serverKey: "server-secret", fetchImpl: fakeSearch });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        app.closeAllConnections();
        app.close(resolve);
      }),
  );
  const base = `http://127.0.0.1:${app.address().port}`;
  const request = (data, headers = {}) =>
    fetch(`${base}/api/research`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(data),
    });
  const health = await (await fetch(`${base}/api/health`)).json();
  assert.equal(health.hasServerKey, true);
  assert.ok(!JSON.stringify(health).includes("server-secret"));
  assert.equal((await request({})).status, 400);
  assert.equal((await request(input, { Origin: "https://untrusted.example" })).status, 403);
  const response = await request(input);
  assert.equal(response.headers.get("content-type"), "text/event-stream");
  const events = [];
  await consumeSSE(response, (event) => events.push(event));
  assert.equal(events.at(-1).report.status, "complete");
  assert.ok(!JSON.stringify(events).includes("server-secret"));
});

test("client-supplied API keys are ignored in favor of the server key", async (t) => {
  const keys = [];
  const app = createApp({
    serverKey: "server-secret",
    fetchImpl: async (url, options) => {
      keys.push(options.headers.Authorization);
      return fakeSearch();
    },
  });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        app.closeAllConnections();
        app.close(resolve);
      }),
  );
  const response = await fetch(`http://127.0.0.1:${app.address().port}/api/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, apiKey: "client-secret" }),
  });
  await consumeSSE(response, () => {});
  assert.ok(keys.every((header) => header === "Bearer server-secret"));
  assert.ok(!keys.some((header) => header.includes("client-secret")));
});

test("missing server API key is actionable before a stream starts", async (t) => {
  const app = createApp({
    serverKey: "",
    fetchImpl: () => {
      throw new Error("Must not call upstream");
    },
  });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        app.closeAllConnections();
        app.close(resolve);
      }),
  );
  const response = await fetch(`http://127.0.0.1:${app.address().port}/api/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /TAVILY_API_KEY/);
});
