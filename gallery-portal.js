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

function safeArchiveName(value) {
  return String(value || "lxe-gallery")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "lxe-gallery";
}

function safeZipEntryName(value, index) {
  const cleaned = String(value || "photo.jpg")
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 180) || "photo.jpg";
  return `${String(index + 1).padStart(3, "0")}-${cleaned}`;
}

function zipMemoryLimit() {
  const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return (isAppleMobile ? 150 : 350) * 1024 ** 2;
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
  const expiration = gallery?.expiresAt ? `<p>This private gallery expires on <strong>${formatDate(gallery.expiresAt)}</strong>.</p>` : "";
  app.innerHTML = `<section class="lock-panel">
    <p class="eyebrow">Private client gallery</p>
    <h1>Your photographs<br />are ready.</h1>
    <p>Enter the four-digit PIN included in the message from Lexus.</p>
    ${expiration}
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
      <div class="gallery-actions"><button id="download-all" class="primary-button" type="button">Download all as ZIP</button><a class="secondary-button" href="mailto:hello@lxephotography.com">Contact Lexus</a></div>
      <div id="download-progress" class="download-progress" hidden><div><span id="download-label">Preparing your ZIP file…</span><strong id="download-count"></strong></div><progress id="download-bar" max="100" value="0"></progress></div>
    </div>
  </section>
  ${photos.length ? `<section class="client-grid" aria-label="Client photographs">${photos.map((photo, index) => `<figure class="client-photo">
    <img src="${photo.viewUrl}" alt="Photograph ${index + 1} from ${escapeHtml(gallery.title)}" loading="${index < 2 ? "eager" : "lazy"}" decoding="async" />
    <span class="photo-number">${String(index + 1).padStart(2, "0")}</span>
    <div class="photo-actions"><a class="view-button" href="${photo.viewUrl}" target="_blank" rel="noopener noreferrer">View full size</a><a class="download-button" href="${photo.downloadUrl}" download="${escapeHtml(photo.originalName)}">Download</a></div>
  </figure>`).join("")}</section>` : '<section class="empty-gallery"><p>Your photographer is still preparing this gallery.</p></section>'}`;

  document.querySelector("#download-all")?.addEventListener("click", downloadAllAsZip);
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function writeUint16(view, offset, value) {
  view.setUint16(offset, value, true);
}

function writeUint32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

function createZipBlob(files) {
  const encoder = new TextEncoder();
  const parts = [];
  const centralParts = [];
  let offset = 0;
  const timestamp = dosDateTime();

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const size = file.bytes.byteLength;
    const checksum = crc32(file.bytes);

    const local = new ArrayBuffer(30);
    const localView = new DataView(local);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0x0800);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, timestamp.time);
    writeUint16(localView, 12, timestamp.day);
    writeUint32(localView, 14, checksum);
    writeUint32(localView, 18, size);
    writeUint32(localView, 22, size);
    writeUint16(localView, 26, nameBytes.length);
    writeUint16(localView, 28, 0);

    parts.push(local, nameBytes, file.bytes);

    const central = new ArrayBuffer(46);
    const centralView = new DataView(central);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0x0800);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, timestamp.time);
    writeUint16(centralView, 14, timestamp.day);
    writeUint32(centralView, 16, checksum);
    writeUint32(centralView, 20, size);
    writeUint32(centralView, 24, size);
    writeUint16(centralView, 28, nameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, offset);
    centralParts.push(central, nameBytes);

    offset += 30 + nameBytes.length + size;
  }

  const centralOffset = offset;
  const centralSize = centralParts.reduce((total, part) => total + part.byteLength, 0);
  const end = new ArrayBuffer(22);
  const endView = new DataView(end);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, files.length);
  writeUint16(endView, 10, files.length);
  writeUint32(endView, 12, centralSize);
  writeUint32(endView, 16, centralOffset);
  writeUint16(endView, 20, 0);

  return new Blob([...parts, ...centralParts, end], { type: "application/zip" });
}

async function downloadAllAsZip() {
  const button = document.querySelector("#download-all");
  const panel = document.querySelector("#download-progress");
  const label = document.querySelector("#download-label");
  const count = document.querySelector("#download-count");
  const bar = document.querySelector("#download-bar");
  if (!photos.length) return;

  const totalBytes = photos.reduce((sum, photo) => sum + Number(photo.sizeBytes || 0), 0);
  const limit = zipMemoryLimit();
  if (totalBytes > limit) {
    label.textContent = `This gallery is too large to package safely on this device. Download the photographs individually instead.`;
    panel.hidden = false;
    return;
  }

  button.disabled = true;
  panel.hidden = false;
  bar.max = photos.length;
  bar.value = 0;
  const files = [];

  try {
    for (let index = 0; index < photos.length; index += 1) {
      const photo = photos[index];
      label.textContent = `Adding photograph ${index + 1}`;
      count.textContent = `${index + 1} of ${photos.length}`;
      const response = await fetch(photo.downloadUrl, { credentials: "same-origin" });
      if (!response.ok) throw new Error(`Could not download photograph ${index + 1}.`);
      files.push({ name: safeZipEntryName(photo.originalName, index), bytes: new Uint8Array(await response.arrayBuffer()) });
      bar.value = index + 1;
    }

    label.textContent = "Building one ZIP file…";
    const zip = createZipBlob(files);
    const url = URL.createObjectURL(zip);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeArchiveName(gallery.title)}-lxe-photography.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
    label.textContent = "Your ZIP download is ready.";
  } catch (error) {
    label.textContent = `${error.message} Use the Download button on individual photographs.`;
  } finally {
    button.disabled = false;
  }
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
    if (data.unlocked) return loadPhotos();
    document.title = "Private Client Gallery | LXE Photography";
    renderPin();
  } catch (error) {
    renderError(error.message, error.status === 410);
  }
}

loadGallery();
