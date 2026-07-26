const EMAIL_TO = "hello@lxephotography.com";
const EMAIL_FROM = "website@lxephotography.com";

const HERO_POLISH_STYLE = `
<style id="hero-readability-patch">
  .hero-note { color: rgba(255, 255, 255, 0.86); }
  .hero-copy h1,
  .hero-copy .hero-lede,
  .hero-copy .eyebrow,
  .hero-copy .hero-note,
  .hero-copy .light-link {
    text-shadow: 0 2px 18px rgba(0, 0, 0, 0.58), 0 1px 2px rgba(0, 0, 0, 0.35);
  }

  @media (max-width: 620px) {
    .hero-image { object-position: 48% center !important; }
    .hero-overlay {
      background:
        linear-gradient(90deg, rgba(17, 19, 14, 0.74) 0%, rgba(17, 19, 14, 0.48) 48%, rgba(17, 19, 14, 0.14) 100%),
        linear-gradient(180deg, rgba(17, 19, 14, 0.06) 0%, rgba(17, 19, 14, 0.20) 30%, rgba(17, 19, 14, 0.72) 67%, rgba(17, 19, 14, 0.95) 100%) !important;
    }
  }
</style>`;

const PAYMENT_ASSETS = `
<link rel="stylesheet" href="/payment-ready.css?v=20260726-2">
<link rel="stylesheet" href="/portfolio-additions.css?v=20260726-2">
<script defer src="/payment-ready.js?v=20260726-2"></script>`;

const ENGAGEMENT_STORY_HTML = `
<div class="portfolio-new-story reveal visible" aria-label="More from this Lake Michigan engagement story">
  <figure>
    <img src="/public/images/portfolio/0395519F-D071-4C9D-BB0C-8AD5A4B259C4.png" alt="Family and engagement story photographed along the Lake Michigan shoreline" loading="lazy" decoding="async" />
    <figcaption><span>Family &amp; engagement</span><span>Lake Michigan</span></figcaption>
  </figure>
  <figure>
    <img src="/public/images/portfolio/IMG_8719.jpeg" alt="Engagement ring reveal photographed along the Lake Michigan shoreline" loading="lazy" decoding="async" />
    <figcaption><span>A joyful yes</span><span>Shoreline</span></figcaption>
  </figure>
</div>`;

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

  return `mailto:${EMAIL_TO}?subject=${subject}&body=${body}`;
}

function validate(data) {
  const required = ["name", "email", "session", "message"];
  for (const key of required) {
    if (!data[key]) return `Missing ${key}.`;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return "Enter a valid email address.";
  }

  if (data.message.length > 2000) return "Message is too long.";
  return null;
}

async function handleInquiry(request, env) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405);
  }

  const contentLength = Number(request.headers.get("Content-Length") || "0");
  if (contentLength > 12_000) {
    return json({ ok: false, error: "Request is too large." }, 413);
  }

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

  if (data.website) {
    return json({ ok: true });
  }

  const age = Date.now() - data.startedAt;
  if (!Number.isFinite(age) || age < 1500 || age > 86_400_000) {
    return json({ ok: false, error: "Please refresh and try again.", fallbackUrl }, 400);
  }

  const validationError = validate(data);
  if (validationError) {
    return json({ ok: false, error: validationError, fallbackUrl }, 400);
  }

  if (!env.EMAIL) {
    return json({
      ok: false,
      error: "Direct website delivery is not configured yet.",
      fallbackUrl
    }, 503);
  }

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
    <p>${escapeHtml(data.message).replaceAll("\n", "<br>")}</p>
  `;

  try {
    await env.EMAIL.send({
      to: EMAIL_TO,
      from: { email: EMAIL_FROM, name: "LXE Photography Website" },
      replyTo: { email: data.email, name: data.name },
      subject: `New inquiry — ${data.session}`,
      text,
      html
    });

    return json({ ok: true });
  } catch (error) {
    console.error("Inquiry email failed", error?.code, error?.message);
    return json({
      ok: false,
      error: "The website could not deliver the inquiry.",
      fallbackUrl
    }, 502);
  }
}

async function polishHomepage(response, url) {
  const isHomepage = url.pathname === "/" || url.pathname === "/index.html";
  const contentType = response.headers.get("Content-Type") || "";

  if (!isHomepage || !contentType.includes("text/html") || !response.ok) {
    return response;
  }

  let html = await response.text();
  html = html.replace(
    "One family, one shoreline, and the honest pieces of a session that cannot be forced.",
    "One family, one engagement, one shoreline, and the honest pieces of a session that cannot be forced."
  );

  if (!html.includes('class="portfolio-new-story')) {
    html = html.replace(
      '<div class="portfolio-closing reveal">',
      `${ENGAGEMENT_STORY_HTML}\n\n      <div class="portfolio-closing reveal">`
    );
  }

  const additions = `${HERO_POLISH_STYLE}\n${PAYMENT_ASSETS}`;
  const polishedHtml = html.replace("</head>", `${additions}\n</head>`);
  const headers = new Headers(response.headers);
  headers.delete("Content-Length");
  headers.set("Cache-Control", "no-store, max-age=0");

  return new Response(polishedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/inquiry") {
      return handleInquiry(request, env);
    }

    const response = await env.ASSETS.fetch(request);
    return polishHomepage(response, url);
  }
};
