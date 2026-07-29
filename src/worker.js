import { cleanupExpiredGalleries, handleGalleryApi, handleGalleryPage } from "./gallery-portal.js";

const INQUIRY_DESTINATION = "lynnlexus421@gmail.com";
const PUBLIC_EMAIL = "hello@lxephotography.com";
const EMAIL_FROM = "hello@lxephotography.com";
const INQUIRY_WINDOW_MS = 15 * 60 * 1000;
const INQUIRY_MAX_ATTEMPTS = 5;
const encoder = new TextEncoder();

const PRIVATE_ASSET_PREFIXES = [
  "/src/",
  "/migrations/",
  "/docs/",
  "/.github/",
  "/node_modules/",
  "/.wrangler/"
];

const PRIVATE_ASSET_PATHS = new Set([
  "/package.json",
  "/package-lock.json",
  "/wrangler.jsonc",
  "/.gitignore",
  "/.dev.vars",
  "/.env",
  "/README.md",
  "/AGENTS.md",
  "/CLAUDE.md"
]);

const PUBLIC_HTML_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "form-action 'self' mailto:"
].join("; ");

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function clean(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return clean(value, 3000)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildMailto(data) {
  const subject = encodeURIComponent(`LXE Photography inquiry — ${data.session}`);
  const body = encodeURIComponent(
    [
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      `Phone: ${data.phone || "Not provided"}`,
      `Session: ${data.session}`,
      `Preferred date: ${data.preferredDate || "Flexible"}`,
      `Preferred time: ${data.preferredTime || "Flexible"}`,
      `Alternate date: ${data.alternateDate || "Not provided"}`,
      "",
      data.message
    ].join("\n")
  );
  return `mailto:${PUBLIC_EMAIL}?subject=${subject}&body=${body}`;
}

function validate(data) {
  const required = ["name", "email", "session", "message"];
  for (const key of required) {
    if (!data[key]) return `Missing ${key}.`;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return "Enter a valid email address.";
  if (data.message.length > 2000) return "Message is too long.";
  if (data.agreement !== "on") return "Please confirm the booking acknowledgement.";
  return null;
}

function normalizedPathname(pathname) {
  try {
    return decodeURIComponent(pathname).toLowerCase();
  } catch {
    return pathname.toLowerCase();
  }
}

function isPrivateAssetPath(pathname) {
  const normalized = normalizedPathname(pathname);
  if (PRIVATE_ASSET_PATHS.has(normalized)) return true;
  return PRIVATE_ASSET_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function isProtectedMutation(request, url) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return false;
  return url.pathname.startsWith("/api/studio/") || url.pathname.startsWith("/api/client-gallery/");
}

function isSameOriginRequest(request, url) {
  const origin = request.headers.get("Origin");
  return !origin || origin === url.origin;
}

function withSecurityHeaders(response, request) {
  const headers = new Headers(response.headers);
  const url = new URL(request.url);
  const contentType = headers.get("Content-Type") || "";

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), usb=()");

  if (contentType.includes("text/html") && !headers.has("Content-Security-Policy")) {
    headers.set("Content-Security-Policy", PUBLIC_HTML_CSP);
  }

  if (url.hostname === "lxephotography.com" || url.hostname === "www.lxephotography.com") {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  if (url.hostname.endsWith(".workers.dev")) {
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  const bytes = new Uint8Array(digest);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function enforceInquiryRateLimit(request, env) {
  if (!env.GALLERY_DB) return null;

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const secret = env.GALLERY_AUTH_SECRET || "lxe-inquiry-rate-limit";
  const ipHash = await sha256(`${ip}:${secret}`);
  const now = Date.now();
  const record = await env.GALLERY_DB.prepare(
    "SELECT window_started_at, attempts FROM inquiry_rate_limits WHERE ip_hash = ? LIMIT 1"
  ).bind(ipHash).first();

  if (!record || now - Number(record.window_started_at) >= INQUIRY_WINDOW_MS) {
    await env.GALLERY_DB.prepare(
      `INSERT INTO inquiry_rate_limits (ip_hash, window_started_at, attempts, last_attempt_at)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(ip_hash) DO UPDATE SET window_started_at = excluded.window_started_at,
         attempts = 1, last_attempt_at = excluded.last_attempt_at`
    ).bind(ipHash, now, now).run();
    return null;
  }

  if (Number(record.attempts) >= INQUIRY_MAX_ATTEMPTS) {
    return json({ ok: false, error: "Too many inquiry attempts. Please wait 15 minutes and try again." }, 429);
  }

  await env.GALLERY_DB.prepare(
    "UPDATE inquiry_rate_limits SET attempts = attempts + 1, last_attempt_at = ? WHERE ip_hash = ?"
  ).bind(now, ipHash).run();
  return null;
}

async function handleInquiry(request, env) {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);
  const contentLength = Number(request.headers.get("Content-Length") || "0");
  if (contentLength > 12_000) return json({ ok: false, error: "Request is too large." }, 413);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  const data = {
    name: clean(body.name, 100),
    email: clean(body.email, 160),
    phone: clean(body.phone, 40),
    session: clean(body.session, 80),
    preferredDate: clean(body.preferredDate, 20),
    preferredTime: clean(body.preferredTime, 40),
    alternateDate: clean(body.alternateDate, 20),
    message: clean(body.message, 2000),
    agreement: clean(body.agreement, 20),
    website: clean(body.website, 200),
    startedAt: Number(body.startedAt || 0),
    page: clean(body.page, 500)
  };

  const fallbackUrl = buildMailto(data);
  if (data.website) return json({ ok: true });

  const rateLimited = await enforceInquiryRateLimit(request, env);
  if (rateLimited) return rateLimited;

  const age = Date.now() - data.startedAt;
  if (!Number.isFinite(age) || age < 1500 || age > 86_400_000) {
    return json({ ok: false, error: "Please refresh and try again.", fallbackUrl }, 400);
  }

  const validationError = validate(data);
  if (validationError) return json({ ok: false, error: validationError, fallbackUrl }, 400);
  if (!env.EMAIL) return json({ ok: false, error: "Direct website delivery is not configured yet.", fallbackUrl }, 503);

  const text = [
    "New LXE Photography inquiry",
    "",
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone || "Not provided"}`,
    `Session: ${data.session}`,
    `Preferred date: ${data.preferredDate || "Flexible"}`,
    `Preferred time: ${data.preferredTime || "Flexible"}`,
    `Alternate date: ${data.alternateDate || "Not provided"}`,
    `Page: ${data.page || "Not provided"}`,
    "",
    "Message:",
    data.message
  ].join("\n");

  const html = `
    <h1>New LXE Photography inquiry</h1>
    <table cellpadding="7" cellspacing="0" border="0">
      <tr><td><strong>Name</strong></td><td>${escapeHtml(data.name)}</td></tr>
      <tr><td><strong>Email</strong></td><td>${escapeHtml(data.email)}</td></tr>
      <tr><td><strong>Phone</strong></td><td>${escapeHtml(data.phone || "Not provided")}</td></tr>
      <tr><td><strong>Session</strong></td><td>${escapeHtml(data.session)}</td></tr>
      <tr><td><strong>Preferred date</strong></td><td>${escapeHtml(data.preferredDate || "Flexible")}</td></tr>
      <tr><td><strong>Preferred time</strong></td><td>${escapeHtml(data.preferredTime || "Flexible")}</td></tr>
      <tr><td><strong>Alternate date</strong></td><td>${escapeHtml(data.alternateDate || "Not provided")}</td></tr>
    </table>
    <h2>Message</h2>
    <p>${escapeHtml(data.message).replaceAll("\n", "<br>")}</p>`;

  try {
    await env.EMAIL.send({
      to: INQUIRY_DESTINATION,
      from: { email: EMAIL_FROM, name: "LXE Photography Website" },
      replyTo: { email: data.email, name: data.name },
      subject: `New inquiry — ${data.session}`,
      text,
      html
    });
    return json({ ok: true });
  } catch (error) {
    console.error("Inquiry email failed", error?.code, error?.message);
    return json({ ok: false, error: "The website could not deliver the inquiry.", fallbackUrl }, 502);
  }
}

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function safeFileName(value) {
  return clean(value, 180).replace(/[^a-zA-Z0-9._-]+/g, "-") || "photo.jpg";
}

async function handleStudioPhotoPreview(request, env, url) {
  if (request.method !== "GET") return null;
  const match = url.pathname.match(/^\/api\/studio\/galleries\/([a-f0-9-]+)\/photos\/([a-f0-9-]+)$/);
  if (!match) return null;
  if (!env.GALLERY_DB || !env.GALLERY_BUCKET) return json({ ok: false, error: "Gallery storage is not configured." }, 503);

  const token = getCookie(request, "lxe_studio_session");
  if (!token) return new Response("Sign in required", { status: 401 });
  const tokenHash = await sha256(token);
  const session = await env.GALLERY_DB.prepare(
    "SELECT id FROM studio_sessions WHERE token_hash = ? AND expires_at > ? LIMIT 1"
  ).bind(tokenHash, Date.now()).first();
  if (!session) return new Response("Sign in required", { status: 401 });

  const photo = await env.GALLERY_DB.prepare(
    "SELECT object_key, original_name, content_type FROM gallery_photos WHERE gallery_id = ? AND id = ? LIMIT 1"
  ).bind(match[1], match[2]).first();
  if (!photo) return new Response("Not found", { status: 404 });

  const object = await env.GALLERY_BUCKET.get(photo.object_key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", photo.content_type || "application/octet-stream");
  headers.set("Content-Disposition", `inline; filename="${safeFileName(photo.original_name)}"`);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return new Response(object.body, { headers });
}

async function cleanupInquiryRateLimits(env) {
  if (!env.GALLERY_DB) return;
  await env.GALLERY_DB.prepare(
    "DELETE FROM inquiry_rate_limits WHERE last_attempt_at < ?"
  ).bind(Date.now() - 24 * 60 * 60 * 1000).run();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === "www.lxephotography.com") {
      const destination = new URL(request.url);
      destination.hostname = "lxephotography.com";
      return withSecurityHeaders(Response.redirect(destination.toString(), 308), request);
    }

    if (isPrivateAssetPath(url.pathname)) {
      return withSecurityHeaders(new Response("Not found", { status: 404 }), request);
    }

    if (isProtectedMutation(request, url) && !isSameOriginRequest(request, url)) {
      return withSecurityHeaders(json({ ok: false, error: "Cross-site request blocked." }, 403), request);
    }

    let response;

    if (url.pathname === "/api/inquiry") {
      response = await handleInquiry(request, env);
      return withSecurityHeaders(response, request);
    }

    const preview = await handleStudioPhotoPreview(request, env, url);
    if (preview) return withSecurityHeaders(preview, request);

    const galleryApi = await handleGalleryApi(request, env, url);
    if (galleryApi) return withSecurityHeaders(galleryApi, request);

    const galleryPage = handleGalleryPage(url, env);
    if (galleryPage) return withSecurityHeaders(galleryPage, request);

    response = await env.ASSETS.fetch(request);
    return withSecurityHeaders(response, request);
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(Promise.all([
      cleanupExpiredGalleries(env),
      cleanupInquiryRateLimits(env)
    ]));
  }
};
