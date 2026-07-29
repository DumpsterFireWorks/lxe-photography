const app = document.querySelector("#gallery-app");
const slug = window.LXE_GALLERY_SLUG;
let gallery = null;
let photos = [];

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = { ok: false, error: "The gallery returned an unreadable response." };
  }
  if (!response.ok) {
    const error = new Error(data.error || "The request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(Number(timestamp)));
}

function daysRemaining(timestamp) {
  return Math.max(0, Math.ceil((Number(timestamp) - Date.now()) / 86400000));
}

function renderError(message, expired = false) {
  app.innerHTML = `<section class="${expired ? "expired-panel" : "error-panel"}">
    <p class="eyebrow">LXE Photography</p>
    <h1>${expired ? "This gallery has\nexpired." : "We couldn’t open\nthis gallery."}</h1>
    <p>${escapeHtml(message)}</p>
    <a class="secondary-button" href="mailto:hello@lxephotography.com">Contact LXE Photography</a>
  </section>`;
}

function renderPin() {
  app.innerHTML = `<section class="lock-panel">
    <p class="eyebrow">Private client gallery</p>
    <h1>${escapeHtml(gallery.title)}</h1>
    <p>Prepared for ${escapeHtml(gallery.clientName)} by LXE Photography.</p>
    <p>This gallery is private and expires on <strong>${formatDate(gallery.expiresAt)}</strong>.</p>
    <form id="pin-form" class="pin-form">
      <label>Four-digit gallery PIN<input id="pin-input" name="pin" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{4}" maxlength="4" required autofocus /></label>
      <button class="primary-button" type="submit">Open my photos</button>
    </form>
    <p id="pin-status" class="status" role="status" aria-live="polite"></p>
  </section>`;

  const form = document.querySelector("#pin-form");
  const input = document.querySelector("#pin-input");
  const status = document.querySelector("#pin-status");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    status.className = "status";
    status.textContent = "Opening your gallery…";
    try {
      await api(`/api/client-gallery/${encodeURIComponent(slug)}/unlock`, {
        method: "POST",
        body: JSON.stringify({ pin: input.value })
      });
      await loadPhotos();
    } catch (error) {
      status.className = "status error";
      status.textContent = error.message;
      input.select();
    } finally {
      button.disabled = false;
    }
  });
}

function renderGallery() {
  const remaining = daysRemaining(gallery.expiresAt);
  app.innerHTML = `<section class="gallery-heading">
    <div><p class="eyebrow">Private client gallery</p><h1>${escapeHtml(gallery.title)}</h1></div>
    <div class="gallery-summary">
      <p>Prepared for <strong>${escapeHtml(gallery.clientName)}</strong> by LXE Photography.</p>
      <p>${photos.length} photograph${photos.length === 1 ? "" : "s"} · Available until ${formatDate(gallery.expiresAt)} · ${remaining} day${remaining === 1 ? "" : "s"} remaining</p>
      <div class="gallery-actions"><button id="download-all" class="primary-button" type="button">Download all photos</button><a class="secondary-button" href="mailto:hello@lxephotography.com">Contact Lexus</a></div>
      <div id="download-progress" class="download-progress" hidden><div><span id="download-label">Preparing downloads…</span><strong id="download-count"></strong></div><progress id="download-bar" max="100" value="0"></progress></div>
    </div>
  </section>
  ${photos.length ? `<section class="client-grid" aria-label="Client photographs">${photos.map((photo, index) => `<figure class="client-photo">
    <img src="${photo.viewUrl}" alt="Photograph ${index + 1} from ${escapeHtml(gallery.title)}" loading="${index < 2 ? "eager" : "lazy"}" />
    <span class="photo-number">${String(index + 1).padStart(2, "0")}</span>
    <div class="photo-actions"><a class="download-button" href="${photo.downloadUrl}" download="${escapeHtml(photo.originalName)}">Download</a></div>
  </figure>`).join("")}</section>` : '<section class="empty-gallery"><p>Your photographer is still preparing this gallery.</p></section>'}`;

  document.querySelector("#download-all")?.addEventListener("click", downloadAll);
}

async function downloadAll() {
  const button = document.querySelector("#download-all");
  const panel = document.querySelector("#download-progress");
  const label = document.querySelector("#download-label");
  const count = document.querySelector("#download-count");
  const bar = document.querySelector("#download-bar");
  if (!photos.length) return;

  button.disabled = true;
  panel.hidden = false;
  bar.max = photos.length;
  bar.value = 0;

  for (let index = 0; index < photos.length; index += 1) {
    const photo = photos[index];
    label.textContent = `Downloading ${photo.originalName}`;
    count.textContent = `${index + 1} of ${photos.length}`;
    try {
      const response = await fetch(photo.downloadUrl, { credentials: "same-origin" });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = photo.originalName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      await new Promise((resolve) => setTimeout(resolve, 350));
    } catch {
      label.textContent = "One or more files could not be downloaded. Use the Download button on those photographs.";
    }
    bar.value = index + 1;
  }

  label.textContent = "All download requests are complete.";
  count.textContent = `${photos.length} of ${photos.length}`;
  button.disabled = false;
}

async function loadPhotos() {
  app.innerHTML = '<div class="gallery-loading">Loading your photographs…</div>';
  try {
    const data = await api(`/api/client-gallery/${encodeURIComponent(slug)}/photos`);
    gallery = data.gallery;
    photos = data.photos || [];
    document.title = `${gallery.title} | LXE Photography`;
    renderGallery();
  } catch (error) {
    if (error.status === 401) return loadGallery();
    renderError(error.message, error.status === 410);
  }
}

async function loadGallery() {
  try {
    const data = await api(`/api/client-gallery/${encodeURIComponent(slug)}`);
    gallery = data.gallery;
    document.title = `${gallery.title} | LXE Photography`;
    if (data.unlocked) return loadPhotos();
    renderPin();
  } catch (error) {
    renderError(error.message, error.status === 410);
  }
}

loadGallery();
