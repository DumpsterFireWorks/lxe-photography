import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import worker from "../src/worker.js";

const endpoint = "https://lxephotography.com/api/inquiry";

function inquiry(overrides = {}) {
  return {
    name: "Jamie Example",
    email: "jamie@example.com",
    phone: "231-555-0100",
    session: "Family Session",
    preferredDate: "2099-08-14",
    preferredTime: "Golden hour / evening",
    alternateDate: "2099-08-21",
    message: "We would love relaxed photos by the lake.",
    agreement: "on",
    website: "",
    startedAt: Date.now() - 2_000,
    page: "https://lxephotography.com/contact/",
    ...overrides
  };
}

function request(body = inquiry(), options = {}) {
  const method = options.method || "POST";
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && method === "POST") {
    headers.set("Content-Type", "application/json");
  }
  return new Request(endpoint, {
    method,
    headers,
    body: method === "GET" || method === "HEAD"
      ? undefined
      : typeof body === "string" ? body : JSON.stringify(body)
  });
}

async function responseFor(body, { env = {}, ...options } = {}) {
  return worker.fetch(request(body, options), env);
}

async function jsonBody(response) {
  return response.json();
}

test("Cloudflare configuration has one destination-restricted EMAIL binding", async () => {
  const config = JSON.parse(await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
  assert.deepEqual(config.send_email, [{
    name: "EMAIL",
    destination_address: "hello@lxephotography.com"
  }]);
});

test("successful delivery uses the approved recipient, sender, Reply-To, subject, and complete body", async () => {
  let sent;
  const payload = inquiry();
  const response = await responseFor(payload, {
    env: {
      EMAIL: {
        async send(message) {
          assert.equal(sent, undefined, "EMAIL.send must be called only once");
          sent = message;
        }
      }
    }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await jsonBody(response), { ok: true });
  assert.equal(sent.to, "hello@lxephotography.com");
  assert.deepEqual(sent.from, {
    email: "hello@lxephotography.com",
    name: "LXE Photography Website"
  });
  assert.deepEqual(sent.replyTo, {
    email: payload.email,
    name: payload.name
  });
  assert.match(sent.subject, /LXE Photography inquiry/i);

  for (const expected of [
    payload.name,
    payload.email,
    payload.phone,
    payload.session,
    payload.preferredDate,
    payload.preferredTime,
    payload.alternateDate,
    payload.message,
    payload.page,
    "Booking acknowledgement: Confirmed"
  ]) {
    assert.ok(sent.text.includes(expected), `text body should include ${expected}`);
  }
  for (const expected of [
    payload.name,
    payload.email,
    payload.phone,
    payload.session,
    payload.preferredDate,
    payload.preferredTime,
    payload.alternateDate,
    payload.message,
    payload.page,
    "Booking acknowledgement"
  ]) {
    assert.ok(sent.html.includes(expected), `HTML body should include ${expected}`);
  }
});

test("optional inquiry fields use clear fallback values when omitted", async () => {
  let sent;
  const response = await responseFor(inquiry({
    phone: "",
    preferredDate: "",
    preferredTime: "",
    alternateDate: "",
    page: ""
  }), {
    env: { EMAIL: { async send(message) { sent = message; } } }
  });

  assert.equal(response.status, 200);
  assert.match(sent.text, /Phone: Not provided/);
  assert.match(sent.text, /Preferred date: Flexible/);
  assert.match(sent.text, /Preferred time: Flexible/);
  assert.match(sent.text, /Alternate date: Not provided/);
  assert.match(sent.text, /Page: Not provided/);
});

test("untrusted values cannot inject email headers", async () => {
  let sent;
  const response = await responseFor(inquiry({
    name: "Jamie\r\nBcc: attacker@example.com",
    session: "Family Session\r\nX-Injected: yes"
  }), {
    env: { EMAIL: { async send(message) { sent = message; } } }
  });

  assert.equal(response.status, 200);
  assert.doesNotMatch(sent.replyTo.name, /[\r\n]/);
  assert.doesNotMatch(sent.subject, /[\r\n]/);
  assert.equal(sent.replyTo.email, "jamie@example.com");
  assert.equal(sent.to, "hello@lxephotography.com");
  assert.equal(sent.from.email, "hello@lxephotography.com");
});

test("only POST with application/json is accepted", async () => {
  const methodResponse = await responseFor(undefined, { method: "GET" });
  assert.equal(methodResponse.status, 405);
  assert.deepEqual(await jsonBody(methodResponse), { ok: false, error: "Method not allowed." });

  const typeResponse = await responseFor(inquiry(), {
    headers: { "Content-Type": "text/plain" }
  });
  assert.equal(typeResponse.status, 415);
  assert.deepEqual(await jsonBody(typeResponse), { ok: false, error: "Unsupported request format." });
});

test("malformed and oversized JSON fail safely", async () => {
  const malformed = await responseFor("{");
  assert.equal(malformed.status, 400);
  assert.deepEqual(await jsonBody(malformed), { ok: false, error: "Invalid request." });

  const wrongShape = await responseFor("null");
  assert.equal(wrongShape.status, 400);
  assert.deepEqual(await jsonBody(wrongShape), { ok: false, error: "Invalid request." });

  const oversized = await responseFor(JSON.stringify(inquiry({
    message: "x".repeat(12_500)
  })));
  assert.equal(oversized.status, 413);
  assert.deepEqual(await jsonBody(oversized), { ok: false, error: "Request is too large." });
});

test("required fields and email addresses are validated server-side", async (t) => {
  for (const key of ["name", "email", "session", "message"]) {
    await t.test(`missing ${key}`, async () => {
      const response = await responseFor(inquiry({ [key]: "" }));
      assert.equal(response.status, 400);
      assert.match((await jsonBody(response)).error, new RegExp(`Missing ${key}`, "i"));
    });
  }

  const agreement = await responseFor(inquiry({ agreement: "" }));
  assert.equal(agreement.status, 400);
  assert.match((await jsonBody(agreement)).error, /booking acknowledgement/i);

  for (const email of [
    "not-an-email",
    "jamie@example.com\r\nBcc: attacker@example.com"
  ]) {
    const response = await responseFor(inquiry({ email }));
    assert.equal(response.status, 400);
    assert.match((await jsonBody(response)).error, /valid email address/i);
  }
});

test("invalid and past preferred or alternate dates are rejected", async (t) => {
  for (const [field, value, message] of [
    ["preferredDate", "2099-02-30", /valid preferred date/i],
    ["alternateDate", "not-a-date", /valid alternate date/i],
    ["preferredDate", "2000-01-01", /Preferred date cannot be in the past/i],
    ["alternateDate", "2000-01-01", /Alternate date cannot be in the past/i]
  ]) {
    await t.test(`${field}: ${value}`, async () => {
      const response = await responseFor(inquiry({ [field]: value }));
      assert.equal(response.status, 400);
      assert.match((await jsonBody(response)).error, message);
    });
  }
});

test("honeypot submissions receive a neutral response without email or rate-limit work", async () => {
  let sent = false;
  let databaseUsed = false;
  const response = await responseFor(inquiry({ website: "https://spam.example" }), {
    env: {
      EMAIL: { async send() { sent = true; } },
      GALLERY_DB: {
        prepare() {
          databaseUsed = true;
          throw new Error("honeypot must not reach the database");
        }
      }
    }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await jsonBody(response), { ok: true });
  assert.equal(sent, false);
  assert.equal(databaseUsed, false);
});

test("existing rate limiting returns 429 without attempting delivery", async () => {
  let sent = false;
  const response = await responseFor(inquiry(), {
    env: {
      EMAIL: { async send() { sent = true; } },
      GALLERY_DB: {
        prepare(sql) {
          assert.match(sql, /SELECT window_started_at, attempts/);
          return {
            bind() {
              return {
                async first() {
                  return {
                    window_started_at: Date.now(),
                    attempts: 5
                  };
                }
              };
            }
          };
        }
      }
    }
  });

  assert.equal(response.status, 429);
  assert.match((await jsonBody(response)).error, /Too many inquiry attempts/i);
  assert.equal(sent, false);
});

test("missing EMAIL binding returns a prepared, customer-safe fallback", async () => {
  const payload = inquiry();
  const response = await responseFor(payload);
  const result = await jsonBody(response);

  assert.equal(response.status, 503);
  assert.equal(result.ok, false);
  assert.match(result.error, /Direct website delivery is not configured yet/i);
  assert.match(result.fallbackUrl, /^mailto:hello@lxephotography\.com\?/);
  const decoded = decodeURIComponent(result.fallbackUrl);
  for (const value of [payload.name, payload.email, payload.phone, payload.session, payload.message]) {
    assert.ok(decoded.includes(value), `fallback should preserve ${value}`);
  }
  assert.doesNotMatch(JSON.stringify(result), /stack|account|secret/i);
});

test("send rejection returns fallback without leaking provider details to response or logs", async () => {
  const secretMarker = "PRIVATE_PROVIDER_SECRET";
  const logged = [];
  const originalError = console.error;
  console.error = (...values) => logged.push(values.join(" "));

  try {
    const response = await responseFor(inquiry(), {
      env: {
        EMAIL: {
          async send() {
            throw new Error(`${secretMarker}\nprovider stack trace`);
          }
        }
      }
    });
    const result = await jsonBody(response);

    assert.equal(response.status, 502);
    assert.equal(result.ok, false);
    assert.match(result.error, /could not deliver the inquiry/i);
    assert.match(result.fallbackUrl, /^mailto:hello@lxephotography\.com\?/);
    assert.doesNotMatch(JSON.stringify(result), new RegExp(`${secretMarker}|stack trace`, "i"));
    assert.doesNotMatch(logged.join("\n"), new RegExp(`${secretMarker}|stack trace`, "i"));
  } finally {
    console.error = originalError;
  }
});
