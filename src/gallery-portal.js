const ADMIN_EMAIL = "lynnlexus421@gmail.com";
const PUBLIC_EMAIL = "hello@lxephotography.com";
const STUDIO_SESSION_HOURS = 12;
const GALLERY_ACCESS_HOURS = 6;
const GALLERY_LIFETIME_DAYS = 30;
const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
const MAX_PHOTOS_PER_GALLERY = 250;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

function clean(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function randomToken(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return bytesToBase64Url(value);
}

function randomDigits(length = 6) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => String(value % 10)).join("");
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

function safeEqual(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function studioCookie(token, maxAge = STUDIO_SESSION_HOURS * 3600) {
  return `lxe_studio_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

function galleryCookie(token, maxAge = GALLERY_ACCESS_HOURS * 3600) {
  return `lxe_gallery_access=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function noStoreHtml(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Content-Security-Policy": "default-src 'self'; img-src 'self' blob: data:; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
    }
  });
}

function portalReady(env) {
  return Boolean(env.GALLERY_DB && env.GALLERY_BUCKET && env.GALLERY_AUTH_SECRET && env.EMAIL);
}

function setupError() {
  return json({
    ok: false,
    error: "The client-gallery portal is not connected to its Cloudflare database, storage bucket, email binding, and authentication secret yet."
  }, 503);
}

async function readJson(request, maxBytes = 20_000) {
  const contentLength = Number(request.headers.get("Content-Length") || "0");
  if (contentLength > maxBytes) throw new Error("Request is too large.");
  return request.json();
}

async function sendStudioCode(env, code) {
  await env.EMAIL.send({
    to: ADMIN_EMAIL,
    from: { email: PUBLIC_EMAIL, name: "LXE Photography Website" },
    replyTo: { email: ADMIN_EMAIL, name: "Lexus Erickson" },
    subject: "LXE Photography Studio sign-in code",
    text: [
      "LXE Photography Studio sign-in",
      "",
      `Your six-digit code is ${code}.`,
      "",
      "This code expires in 10 minutes. If you did not request it, ignore this email."
    ].join("\n"),
    html: `<h1>LXE Photography Studio sign-in</h1><p>Your six-digit code is:</p><p><strong>${code}</strong></p><p>This code expires in 10 minutes. If you did not request it, ignore this email.</p>`
  });
}

async function requestStudioCode(request, env) {
  if (!portalReady(env)) return setupError();

  let body;
  try {
    body = await readJson(request);
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  const email = clean(body.email, 160).toLowerCase();
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipHash = await sha256(`${ip}:${env.GALLERY_AUTH_SECRET}`);
  const cutoff = Date.now() - 15 * 60 * 1000;
  const recent = await env.GALLERY_DB.prepare(
    "SELECT COUNT(*) AS total FROM studio_login_codes WHERE requested_at > ? AND ip_hash = ?"
  ).bind(cutoff, ipHash).first();

  if (Number(recent?.total || 0) >= 5) {
    return json({ ok: false, error: "Too many sign-in requests. Wait 15 minutes and try again." }, 429);
  }

  if (email !== ADMIN_EMAIL) {
    await env.GALLERY_DB.prepare(
      "INSERT INTO studio_login_codes (id, email, code_hash, salt, requested_at, expires_at, used_at, attempts, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(crypto.randomUUID(), email, "invalid", "invalid", Date.now(), Date.now() + 10 * 60 * 1000, Date.now(), 0, ipHash).run();
    return json({ ok: true, message: "If that email is authorized, a sign-in code has been sent." });
  }

  const code = randomDigits(6);
  const salt = randomToken(16);
  const codeHash = await sha256(`${code}:${salt}:${env.GALLERY_AUTH_SECRET}`);
  const now = Date.now();

  await env.GALLERY_DB.prepare(
    "INSERT INTO studio_login_codes (id, email, code_hash, salt, requested_at, expires_at, used_at, attempts, ip_hash) VALUES (?, ?, ?, ?, ?, ?, NULL, 0, ?)"
  ).bind(crypto.randomUUID(), email, codeHash, salt, now, now + 10 * 60 * 1000, ipHash).run();

  try {
    await sendStudioCode(env, code);
  } catch (error) {
    console.error("Studio sign-in email delivery failed.", error?.code || "UNKNOWN");
    return json({ ok: false, error: "The sign-in code could not be sent. Please try again." }, 502);
  }
  return json({ ok: true, message: "A six-digit sign-in code was sent to Lexus." });
}

async function verifyStudioCode(request, env) {
  if (!portalReady(env)) return setupError();

  let body;
  try {
    body = await readJson(request);
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  const email = clean(body.email, 160).toLowerCase();
  const code = clean(body.code, 6);
  if (email !== ADMIN_EMAIL || !/^\d{6}$/.test(code)) {
    return json({ ok: false, error: "That code is not valid." }, 401);
  }

  const record = await env.GALLERY_DB.prepare(
    "SELECT * FROM studio_login_codes WHERE email = ? AND used_at IS NULL ORDER BY requested_at DESC LIMIT 1"
  ).bind(email).first();

  if (!record || Number(record.expires_at) < Date.now() || Number(record.attempts) >= 6) {
    return json({ ok: false, error: "That code expired. Request a new one." }, 401);
  }

  const candidate = await sha256(`${code}:${record.salt}:${env.GALLERY_AUTH_SECRET}`);
  if (!safeEqual(candidate, record.code_hash)) {
    await env.GALLERY_DB.prepare("UPDATE studio_login_codes SET attempts = attempts + 1 WHERE id = ?").bind(record.id).run();
    return json({ ok: false, error: "That code is not valid." }, 401);
  }

  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const now = Date.now();
  const expiresAt = now + STUDIO_SESSION_HOURS * 3600 * 1000;

  await env.GALLERY_DB.batch([
    env.GALLERY_DB.prepare("UPDATE studio_login_codes SET used_at = ? WHERE id = ?").bind(now, record.id),
    env.GALLERY_DB.prepare(
      "INSERT INTO studio_sessions (id, token_hash, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(crypto.randomUUID(), tokenHash, now, expiresAt, now)
  ]);

  return json({ ok: true, expiresAt }, 200, { "Set-Cookie": studioCookie(token) });
}

async function requireStudio(request, env) {
  if (!portalReady(env)) return { response: setupError() };
  const token = getCookie(request, "lxe_studio_session");
  if (!token) return { response: json({ ok: false, error: "Sign in required." }, 401) };
  const tokenHash = await sha256(token);
  const session = await env.GALLERY_DB.prepare(
    "SELECT * FROM studio_sessions WHERE token_hash = ? AND expires_at > ? LIMIT 1"
  ).bind(tokenHash, Date.now()).first();
  if (!session) return { response: json({ ok: false, error: "Your studio session expired." }, 401) };
  await env.GALLERY_DB.prepare("UPDATE studio_sessions SET last_seen_at = ? WHERE id = ?").bind(Date.now(), session.id).run();
  return { session };
}

async function logoutStudio(request, env) {
  if (env.GALLERY_DB) {
    const token = getCookie(request, "lxe_studio_session");
    if (token) {
      const tokenHash = await sha256(token);
      await env.GALLERY_DB.prepare("DELETE FROM studio_sessions WHERE token_hash = ?").bind(tokenHash).run();
    }
  }
  return json({ ok: true }, 200, { "Set-Cookie": studioCookie("", 0) });
}

function slugify(value) {
  return clean(value, 100)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function safeFileName(value) {
  const cleaned = clean(value, 180).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "photo.jpg";
}

async function uniqueSlug(env, requested, title) {
  const base = slugify(requested || title) || `gallery-${randomToken(4).toLowerCase()}`;
  let slug = base;
  for (let suffix = 1; suffix <= 50; suffix += 1) {
    const existing = await env.GALLERY_DB.prepare("SELECT id FROM galleries WHERE slug = ? LIMIT 1").bind(slug).first();
    if (!existing) return slug;
    slug = `${base}-${suffix + 1}`;
  }
  return `${base}-${randomToken(4).toLowerCase()}`;
}

async function listStudioGalleries(request, env) {
  const auth = await requireStudio(request, env);
  if (auth.response) return auth.response;

  const result = await env.GALLERY_DB.prepare(
    `SELECT g.id, g.slug, g.title, g.client_name AS clientName, g.created_at AS createdAt,
            g.expires_at AS expiresAt, g.status,
            COUNT(p.id) AS photoCount,
            COALESCE(SUM(p.size_bytes), 0) AS totalBytes
       FROM galleries g
       LEFT JOIN gallery_photos p ON p.gallery_id = g.id
      GROUP BY g.id
      ORDER BY g.created_at DESC`
  ).all();

  return json({ ok: true, galleries: result.results || [] });
}

async function createGallery(request, env) {
  const auth = await requireStudio(request, env);
  if (auth.response) return auth.response;

  let body;
  try {
    body = await readJson(request);
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  const title = clean(body.title, 120);
  const clientName = clean(body.clientName, 120);
  const pin = clean(body.pin, 4);
  if (!title || !clientName || !/^\d{4}$/.test(pin)) {
    return json({ ok: false, error: "Enter a gallery title, client name, and four-digit PIN." }, 400);
  }

  const slug = await uniqueSlug(env, body.slug, title);
  const salt = randomToken(16);
  const pinHash = await sha256(`${pin}:${salt}:${env.GALLERY_AUTH_SECRET}`);
  const now = Date.now();
  const expiresAt = now + GALLERY_LIFETIME_DAYS * 24 * 3600 * 1000;
  const id = crypto.randomUUID();

  await env.GALLERY_DB.prepare(
    `INSERT INTO galleries
      (id, slug, title, client_name, pin_hash, pin_salt, created_at, expires_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`
  ).bind(id, slug, title, clientName, pinHash, salt, now, expiresAt).run();

  return json({ ok: true, gallery: { id, slug, title, clientName, createdAt: now, expiresAt, photoCount: 0 } }, 201);
}

async function getStudioGallery(request, env, galleryId) {
  const auth = await requireStudio(request, env);
  if (auth.response) return auth.response;

  const gallery = await env.GALLERY_DB.prepare(
    "SELECT id, slug, title, client_name AS clientName, created_at AS createdAt, expires_at AS expiresAt, status FROM galleries WHERE id = ? LIMIT 1"
  ).bind(galleryId).first();
  if (!gallery) return json({ ok: false, error: "Gallery not found." }, 404);

  const photos = await env.GALLERY_DB.prepare(
    "SELECT id, original_name AS originalName, size_bytes AS sizeBytes, content_type AS contentType, uploaded_at AS uploadedAt, sort_order AS sortOrder FROM gallery_photos WHERE gallery_id = ? ORDER BY sort_order, uploaded_at"
  ).bind(galleryId).all();

  return json({ ok: true, gallery, photos: photos.results || [] });
}

async function uploadPhoto(request, env, galleryId) {
  const auth = await requireStudio(request, env);
  if (auth.response) return auth.response;

  const gallery = await env.GALLERY_DB.prepare("SELECT id, status, expires_at FROM galleries WHERE id = ? LIMIT 1").bind(galleryId).first();
  if (!gallery) return json({ ok: false, error: "Gallery not found." }, 404);
  if (gallery.status !== "active" || Number(gallery.expires_at) <= Date.now()) {
    return json({ ok: false, error: "This gallery is expired." }, 410);
  }

  const count = await env.GALLERY_DB.prepare("SELECT COUNT(*) AS total FROM gallery_photos WHERE gallery_id = ?").bind(galleryId).first();
  if (Number(count?.total || 0) >= MAX_PHOTOS_PER_GALLERY) {
    return json({ ok: false, error: `A gallery can contain up to ${MAX_PHOTOS_PER_GALLERY} photographs.` }, 400);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "Upload could not be read." }, 400);
  }

  const file = form.get("photo");
  if (!(file instanceof File)) return json({ ok: false, error: "Choose a photograph to upload." }, 400);
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return json({ ok: false, error: "Upload a JPEG, PNG, or WebP image." }, 400);
  if (file.size <= 0 || file.size > MAX_PHOTO_BYTES) {
    return json({ ok: false, error: "Each photograph must be smaller than 25 MB." }, 400);
  }

  const photoId = crypto.randomUUID();
  const originalName = safeFileName(file.name);
  const objectKey = `galleries/${galleryId}/${photoId}-${originalName}`;
  const now = Date.now();
  const maxOrder = await env.GALLERY_DB.prepare("SELECT COALESCE(MAX(sort_order), -1) AS value FROM gallery_photos WHERE gallery_id = ?").bind(galleryId).first();
  const sortOrder = Number(maxOrder?.value ?? -1) + 1;

  await env.GALLERY_BUCKET.put(objectKey, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { galleryId, photoId, originalName, expiresAt: String(gallery.expires_at) }
  });

  try {
    await env.GALLERY_DB.prepare(
      `INSERT INTO gallery_photos
        (id, gallery_id, object_key, original_name, content_type, size_bytes, uploaded_at, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(photoId, galleryId, objectKey, originalName, file.type, file.size, now, sortOrder).run();
  } catch (error) {
    await env.GALLERY_BUCKET.delete(objectKey);
    throw error;
  }

  return json({ ok: true, photo: { id: photoId, originalName, contentType: file.type, sizeBytes: file.size, uploadedAt: now, sortOrder } }, 201);
}

async function deletePhoto(request, env, galleryId, photoId) {
  const auth = await requireStudio(request, env);
  if (auth.response) return auth.response;
  const photo = await env.GALLERY_DB.prepare("SELECT object_key FROM gallery_photos WHERE id = ? AND gallery_id = ? LIMIT 1").bind(photoId, galleryId).first();
  if (!photo) return json({ ok: false, error: "Photo not found." }, 404);
  await env.GALLERY_BUCKET.delete(photo.object_key);
  await env.GALLERY_DB.prepare("DELETE FROM gallery_photos WHERE id = ?").bind(photoId).run();
  return json({ ok: true });
}

async function deleteR2Prefix(bucket, prefix) {
  let cursor;
  do {
    const listed = await bucket.list({ prefix, cursor, limit: 1000 });
    if (listed.objects.length) await bucket.delete(listed.objects.map((object) => object.key));
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
}

async function deleteGallery(request, env, galleryId) {
  const auth = await requireStudio(request, env);
  if (auth.response) return auth.response;
  const gallery = await env.GALLERY_DB.prepare("SELECT id FROM galleries WHERE id = ? LIMIT 1").bind(galleryId).first();
  if (!gallery) return json({ ok: false, error: "Gallery not found." }, 404);
  await deleteR2Prefix(env.GALLERY_BUCKET, `galleries/${galleryId}/`);
  await env.GALLERY_DB.prepare("DELETE FROM galleries WHERE id = ?").bind(galleryId).run();
  return json({ ok: true });
}

async function signGalleryAccess(galleryId, secret) {
  const expiresAt = Date.now() + GALLERY_ACCESS_HOURS * 3600 * 1000;
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({ galleryId, expiresAt })));
  const signature = await hmac(payload, secret);
  return `${payload}.${signature}`;
}

async function verifyGalleryAccess(request, galleryId, secret) {
  const token = getCookie(request, "lxe_gallery_access");
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = await hmac(payload, secret);
  if (!safeEqual(signature, expected)) return false;
  try {
    const data = JSON.parse(decoder.decode(base64UrlToBytes(payload)));
    return data.galleryId === galleryId && Number(data.expiresAt) > Date.now();
  } catch {
    return false;
  }
}

async function galleryBySlug(env, slug) {
  return env.GALLERY_DB.prepare(
    "SELECT id, slug, title, client_name AS clientName, created_at AS createdAt, expires_at AS expiresAt, status FROM galleries WHERE slug = ? LIMIT 1"
  ).bind(slug).first();
}

async function getPublicGallery(request, env, slug) {
  if (!portalReady(env)) return setupError();
  const gallery = await galleryBySlug(env, slug);
  if (!gallery) return json({ ok: false, error: "Gallery not found." }, 404);
  if (gallery.status !== "active" || Number(gallery.expiresAt) <= Date.now()) {
    return json({ ok: false, error: "This gallery has expired." }, 410);
  }
  const unlocked = await verifyGalleryAccess(request, gallery.id, env.GALLERY_AUTH_SECRET);
  return json({ ok: true, gallery: { slug: gallery.slug, title: gallery.title, clientName: gallery.clientName, expiresAt: gallery.expiresAt }, unlocked });
}

async function unlockGallery(request, env, slug) {
  if (!portalReady(env)) return setupError();
  const gallery = await env.GALLERY_DB.prepare("SELECT * FROM galleries WHERE slug = ? LIMIT 1").bind(slug).first();
  if (!gallery) return json({ ok: false, error: "Gallery not found." }, 404);
  if (gallery.status !== "active" || Number(gallery.expires_at) <= Date.now()) {
    return json({ ok: false, error: "This gallery has expired." }, 410);
  }

  let body;
  try {
    body = await readJson(request);
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }
  const pin = clean(body.pin, 4);
  if (!/^\d{4}$/.test(pin)) return json({ ok: false, error: "Enter the four-digit PIN." }, 400);

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const attemptKey = await sha256(`${gallery.id}:${ip}:${env.GALLERY_AUTH_SECRET}`);
  const attempt = await env.GALLERY_DB.prepare("SELECT * FROM gallery_pin_attempts WHERE attempt_key = ? LIMIT 1").bind(attemptKey).first();
  if (attempt?.locked_until && Number(attempt.locked_until) > Date.now()) {
    return json({ ok: false, error: "Too many incorrect attempts. Try again in 15 minutes." }, 429);
  }

  const candidate = await sha256(`${pin}:${gallery.pin_salt}:${env.GALLERY_AUTH_SECRET}`);
  if (!safeEqual(candidate, gallery.pin_hash)) {
    const now = Date.now();
    const resetWindow = !attempt || now - Number(attempt.first_attempt_at) > 15 * 60 * 1000;
    const failures = resetWindow ? 1 : Number(attempt.failures || 0) + 1;
    const lockedUntil = failures >= 6 ? now + 15 * 60 * 1000 : null;
    await env.GALLERY_DB.prepare(
      `INSERT INTO gallery_pin_attempts (attempt_key, gallery_id, failures, first_attempt_at, last_attempt_at, locked_until)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(attempt_key) DO UPDATE SET failures = excluded.failures, first_attempt_at = excluded.first_attempt_at,
         last_attempt_at = excluded.last_attempt_at, locked_until = excluded.locked_until`
    ).bind(attemptKey, gallery.id, failures, resetWindow ? now : attempt.first_attempt_at, now, lockedUntil).run();
    return json({ ok: false, error: "That PIN is not correct." }, 401);
  }

  await env.GALLERY_DB.prepare("DELETE FROM gallery_pin_attempts WHERE attempt_key = ?").bind(attemptKey).run();
  const token = await signGalleryAccess(gallery.id, env.GALLERY_AUTH_SECRET);
  return json({ ok: true }, 200, { "Set-Cookie": galleryCookie(token) });
}

async function listPublicPhotos(request, env, slug) {
  if (!portalReady(env)) return setupError();
  const gallery = await galleryBySlug(env, slug);
  if (!gallery) return json({ ok: false, error: "Gallery not found." }, 404);
  if (gallery.status !== "active" || Number(gallery.expiresAt) <= Date.now()) {
    return json({ ok: false, error: "This gallery has expired." }, 410);
  }
  if (!(await verifyGalleryAccess(request, gallery.id, env.GALLERY_AUTH_SECRET))) {
    return json({ ok: false, error: "Enter the gallery PIN." }, 401);
  }

  const photos = await env.GALLERY_DB.prepare(
    "SELECT id, original_name AS originalName, size_bytes AS sizeBytes, content_type AS contentType FROM gallery_photos WHERE gallery_id = ? ORDER BY sort_order, uploaded_at"
  ).bind(gallery.id).all();

  return json({
    ok: true,
    gallery: { title: gallery.title, clientName: gallery.clientName, expiresAt: gallery.expiresAt },
    photos: (photos.results || []).map((photo) => ({
      ...photo,
      viewUrl: `/api/client-gallery/${encodeURIComponent(slug)}/photo/${photo.id}`,
      downloadUrl: `/api/client-gallery/${encodeURIComponent(slug)}/photo/${photo.id}?download=1`
    }))
  });
}

async function servePublicPhoto(request, env, slug, photoId) {
  if (!portalReady(env)) return setupError();
  const gallery = await galleryBySlug(env, slug);
  if (!gallery) return new Response("Not found", { status: 404 });
  if (gallery.status !== "active" || Number(gallery.expiresAt) <= Date.now()) return new Response("Gallery expired", { status: 410 });
  if (!(await verifyGalleryAccess(request, gallery.id, env.GALLERY_AUTH_SECRET))) return new Response("PIN required", { status: 401 });

  const photo = await env.GALLERY_DB.prepare(
    "SELECT object_key, original_name, content_type FROM gallery_photos WHERE id = ? AND gallery_id = ? LIMIT 1"
  ).bind(photoId, gallery.id).first();
  if (!photo) return new Response("Not found", { status: 404 });

  const object = await env.GALLERY_BUCKET.get(photo.object_key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", photo.content_type || "application/octet-stream");
  headers.set("Cache-Control", "private, no-store");
  headers.set("ETag", object.httpEtag);
  headers.set("Content-Disposition", `${new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="${safeFileName(photo.original_name)}"`);
  return new Response(object.body, { headers });
}

function galleryPageHtml(slug) {
  const encodedSlug = JSON.stringify(slug);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex,nofollow,noarchive" />
  <meta name="referrer" content="no-referrer" />
  <title>Private Client Gallery | LXE Photography</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600&family=Italiana&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/gallery-portal.css?v=1" />
  <script>window.LXE_GALLERY_SLUG=${encodedSlug};</script>
  <script defer src="/gallery-portal.js?v=1"></script>
</head>
<body>
  <header class="gallery-brand"><a href="/" aria-label="LXE Photography home"><span>LXE</span><small>PHOTOGRAPHY</small></a></header>
  <main id="gallery-app" class="gallery-app" aria-live="polite"><div class="gallery-loading">Opening your private gallery…</div></main>
  <footer class="gallery-footer">Private delivery by LXE Photography · Muskegon, Michigan</footer>
</body>
</html>`;
}

export function handleGalleryPage(url, env) {
  const match = url.pathname.match(/^\/gallery\/([a-z0-9-]+)\/?$/);
  if (!match) return null;
  if (!portalReady(env)) return noStoreHtml("<h1>Gallery portal setup is not complete.</h1>", 503);
  return noStoreHtml(galleryPageHtml(match[1]));
}

export async function handleGalleryApi(request, env, url) {
  if (!url.pathname.startsWith("/api/studio/") && !url.pathname.startsWith("/api/client-gallery/")) return null;

  try {
    if (url.pathname === "/api/studio/login/request" && request.method === "POST") return requestStudioCode(request, env);
    if (url.pathname === "/api/studio/login/verify" && request.method === "POST") return verifyStudioCode(request, env);
    if (url.pathname === "/api/studio/logout" && request.method === "POST") return logoutStudio(request, env);
    if (url.pathname === "/api/studio/galleries" && request.method === "GET") return listStudioGalleries(request, env);
    if (url.pathname === "/api/studio/galleries" && request.method === "POST") return createGallery(request, env);

    let match = url.pathname.match(/^\/api\/studio\/galleries\/([a-f0-9-]+)$/);
    if (match && request.method === "GET") return getStudioGallery(request, env, match[1]);
    if (match && request.method === "DELETE") return deleteGallery(request, env, match[1]);

    match = url.pathname.match(/^\/api\/studio\/galleries\/([a-f0-9-]+)\/photos$/);
    if (match && request.method === "POST") return uploadPhoto(request, env, match[1]);

    match = url.pathname.match(/^\/api\/studio\/galleries\/([a-f0-9-]+)\/photos\/([a-f0-9-]+)$/);
    if (match && request.method === "DELETE") return deletePhoto(request, env, match[1], match[2]);

    match = url.pathname.match(/^\/api\/client-gallery\/([a-z0-9-]+)$/);
    if (match && request.method === "GET") return getPublicGallery(request, env, match[1]);

    match = url.pathname.match(/^\/api\/client-gallery\/([a-z0-9-]+)\/unlock$/);
    if (match && request.method === "POST") return unlockGallery(request, env, match[1]);

    match = url.pathname.match(/^\/api\/client-gallery\/([a-z0-9-]+)\/photos$/);
    if (match && request.method === "GET") return listPublicPhotos(request, env, match[1]);

    match = url.pathname.match(/^\/api\/client-gallery\/([a-z0-9-]+)\/photo\/([a-f0-9-]+)$/);
    if (match && request.method === "GET") return servePublicPhoto(request, env, match[1], match[2]);

    return json({ ok: false, error: "Not found." }, 404);
  } catch (error) {
    console.error("Gallery portal error", error?.stack || error?.message || error);
    return json({ ok: false, error: "The gallery portal hit an unexpected error." }, 500);
  }
}

export async function cleanupExpiredGalleries(env) {
  if (!env.GALLERY_DB || !env.GALLERY_BUCKET) return;
  const now = Date.now();
  const expired = await env.GALLERY_DB.prepare(
    "SELECT id FROM galleries WHERE expires_at <= ? OR status = 'deleted' LIMIT 100"
  ).bind(now).all();

  for (const gallery of expired.results || []) {
    await deleteR2Prefix(env.GALLERY_BUCKET, `galleries/${gallery.id}/`);
    await env.GALLERY_DB.prepare("DELETE FROM galleries WHERE id = ?").bind(gallery.id).run();
  }

  await env.GALLERY_DB.batch([
    env.GALLERY_DB.prepare("DELETE FROM studio_login_codes WHERE expires_at < ?").bind(now - 24 * 3600 * 1000),
    env.GALLERY_DB.prepare("DELETE FROM studio_sessions WHERE expires_at < ?").bind(now),
    env.GALLERY_DB.prepare("DELETE FROM gallery_pin_attempts WHERE last_attempt_at < ?").bind(now - 24 * 3600 * 1000)
  ]);
}
