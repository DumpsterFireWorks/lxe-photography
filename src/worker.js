import { cleanupExpiredGalleries, handleGalleryApi, handleGalleryPage } from "./gallery-portal.js";

const INQUIRY_DESTINATION = "lynnlexus421@gmail.com";
const PUBLIC_EMAIL = "hello@lxephotography.com";
const EMAIL_FROM = "hello@lxephotography.com";
const encoder = new TextEncoder();

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

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  const bytes = new Uint8Array(digest);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/inquiry") return handleInquiry(request, env);

    const preview = await handleStudioPhotoPreview(request, env, url);
    if (preview) return preview;

    const galleryApi = await handleGalleryApi(request, env, url);
    if (galleryApi) return galleryApi;

    const galleryPage = handleGalleryPage(url, env);
    if (galleryPage) return galleryPage;

    return env.ASSETS.fetch(request);
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(cleanupExpiredGalleries(env));
  }
};
