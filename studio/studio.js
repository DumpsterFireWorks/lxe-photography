const loginView = document.querySelector("#login-view");
const dashboardView = document.querySelector("#dashboard-view");
const emailForm = document.querySelector("#email-form");
const codeForm = document.querySelector("#code-form");
const loginEmail = document.querySelector("#login-email");
const loginCode = document.querySelector("#login-code");
const loginStatus = document.querySelector("#login-status");
const logoutButton = document.querySelector("#logout-button");
const createForm = document.querySelector("#create-gallery-form");
const createStatus = document.querySelector("#create-status");
const galleryPin = document.querySelector("#gallery-pin");
const galleryList = document.querySelector("#gallery-list");
const sharePanel = document.querySelector("#share-panel");
const shareLink = document.querySelector("#new-gallery-link");
const sharePin = document.querySelector("#new-gallery-pin");
const shareExpiry = document.querySelector("#new-gallery-expiry");
const manageDialog = document.querySelector("#manage-dialog");
const manageTitle = document.querySelector("#manage-title");
const manageLink = document.querySelector("#manage-link");
const manageExpiry = document.querySelector("#manage-expiry");
const photoInput = document.querySelector("#photo-input");
const photoList = document.querySelector("#photo-list");
const manageStatus = document.querySelector("#manage-status");
const uploadButton = document.querySelector("#upload-button");
const uploadProgress = document.querySelector("#upload-progress");
const uploadProgressLabel = document.querySelector("#upload-progress-label");
const uploadProgressCount = document.querySelector("#upload-progress-count");
const uploadProgressBar = document.querySelector("#upload-progress-bar");
const deleteGalleryButton = document.querySelector("#delete-gallery-button");

let activeGallery = null;
let newlyCreated = null;

function setStatus(element, message = "", type = "") {
  element.textContent = message;
  element.className = `status${type ? ` ${type}` : ""}`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {})
    }
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = { ok: false, error: "The website returned an unreadable response." };
  }
  if (!response.ok) {
    const error = new Error(data.error || "The request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}

function showLogin(message = "") {
  loginView.hidden = false;
  dashboardView.hidden = true;
  logoutButton.hidden = true;
  if (message) setStatus(loginStatus, message, "error");
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
  logoutButton.hidden = false;
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(Number(timestamp)));
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
}

function galleryUrl(slug) {
  return `${window.location.origin}/gallery/${slug}`;
}

function randomPin() {
  const values = new Uint16Array(1);
  crypto.getRandomValues(values);
  return String(values[0] % 10000).padStart(4, "0");
}

function clientMessage(gallery, pin) {
  return `Your photos from LXE Photography are ready!\n\nGallery: ${galleryUrl(gallery.slug)}\nPIN: ${pin}\n\nPlease download and save your photographs before ${formatDate(gallery.expiresAt)}. The private gallery expires after 30 days.`;
}

async function copyText(value, button) {
  await navigator.clipboard.writeText(value);
  const original = button.textContent;
  button.textContent = "Copied";
  setTimeout(() => { button.textContent = original; }, 1600);
}

emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = emailForm.querySelector("button[type='submit']");
  button.disabled = true;
  setStatus(loginStatus, "Sending the code…");
  try {
    const data = await api("/api/studio/login/request", {
      method: "POST",
      body: JSON.stringify({ email: loginEmail.value })
    });
    emailForm.hidden = true;
    codeForm.hidden = false;
    loginCode.focus();
    setStatus(loginStatus, data.message || "Check Lexus’s email for the code.", "success");
  } catch (error) {
    setStatus(loginStatus, error.message, "error");
  } finally {
    button.disabled = false;
  }
});

codeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = codeForm.querySelector("button[type='submit']");
  button.disabled = true;
  setStatus(loginStatus, "Checking the code…");
  try {
    await api("/api/studio/login/verify", {
      method: "POST",
      body: JSON.stringify({ email: loginEmail.value, code: loginCode.value })
    });
    loginCode.value = "";
    showDashboard();
    await loadGalleries();
  } catch (error) {
    setStatus(loginStatus, error.message, "error");
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#request-another-code").addEventListener("click", () => {
  codeForm.hidden = true;
  emailForm.hidden = false;
  loginCode.value = "";
  setStatus(loginStatus);
});

logoutButton.addEventListener("click", async () => {
  try { await api("/api/studio/logout", { method: "POST", body: "{}" }); } catch {}
  emailForm.hidden = false;
  codeForm.hidden = true;
  showLogin();
});

document.querySelector("#generate-pin").addEventListener("click", () => {
  galleryPin.value = randomPin();
  galleryPin.focus();
  galleryPin.select();
});

createForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = createForm.querySelector("button[type='submit']");
  const formData = new FormData(createForm);
  const pin = String(formData.get("pin") || "");
  button.disabled = true;
  setStatus(createStatus, "Creating the private gallery…");
  try {
    const data = await api("/api/studio/galleries", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    newlyCreated = { ...data.gallery, pin };
    shareLink.href = galleryUrl(data.gallery.slug);
    shareLink.textContent = galleryUrl(data.gallery.slug);
    sharePin.textContent = pin;
    shareExpiry.textContent = formatDate(data.gallery.expiresAt);
    sharePanel.hidden = false;
    setStatus(createStatus, "Gallery created. Upload the finished photos next.", "success");
    createForm.reset();
    galleryPin.value = randomPin();
    await loadGalleries();
    sharePanel.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    if (error.status === 401) return showLogin("Your studio session expired. Sign in again.");
    setStatus(createStatus, error.message, "error");
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#copy-client-message").addEventListener("click", async (event) => {
  if (!newlyCreated) return;
  await copyText(clientMessage(newlyCreated, newlyCreated.pin), event.currentTarget);
});

document.querySelector("#manage-new-gallery").addEventListener("click", () => {
  if (newlyCreated) openGallery(newlyCreated.id);
});

document.querySelector("#refresh-galleries").addEventListener("click", loadGalleries);

async function loadGalleries() {
  galleryList.innerHTML = '<p class="empty-state">Loading galleries…</p>';
  try {
    const data = await api("/api/studio/galleries");
    showDashboard();
    renderGalleries(data.galleries || []);
  } catch (error) {
    if (error.status === 401) return showLogin();
    galleryList.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderGalleries(galleries) {
  if (!galleries.length) {
    galleryList.innerHTML = '<p class="empty-state">No client galleries yet. Create the first one above.</p>';
    return;
  }

  galleryList.innerHTML = galleries.map((gallery) => {
    const expired = Number(gallery.expiresAt) <= Date.now();
    return `<article class="gallery-card">
      <div>
        <h3>${escapeHtml(gallery.title)}</h3>
        <p>${escapeHtml(gallery.clientName)} · ${Number(gallery.photoCount)} photos · ${formatBytes(gallery.totalBytes)}</p>
        <p class="${expired ? "expired" : ""}">${expired ? "Expired" : `Expires ${formatDate(gallery.expiresAt)}`}</p>
        <p><a href="${galleryUrl(gallery.slug)}" target="_blank" rel="noopener noreferrer">${galleryUrl(gallery.slug)}</a></p>
      </div>
      <button class="secondary-button manage-gallery" type="button" data-id="${gallery.id}">Manage</button>
    </article>`;
  }).join("");

  galleryList.querySelectorAll(".manage-gallery").forEach((button) => {
    button.addEventListener("click", () => openGallery(button.dataset.id));
  });
}

async function openGallery(galleryId) {
  setStatus(manageStatus, "Loading gallery…");
  photoList.innerHTML = "";
  photoInput.value = "";
  if (!manageDialog.open) manageDialog.showModal();
  try {
    const data = await api(`/api/studio/galleries/${galleryId}`);
    activeGallery = data.gallery;
    manageTitle.textContent = data.gallery.title;
    manageLink.href = galleryUrl(data.gallery.slug);
    manageLink.textContent = galleryUrl(data.gallery.slug);
    manageExpiry.textContent = `Expires ${formatDate(data.gallery.expiresAt)}`;
    renderPhotos(data.photos || []);
    setStatus(manageStatus, data.photos?.length ? "" : "Choose the finished photographs and upload them here.");
  } catch (error) {
    if (error.status === 401) {
      manageDialog.close();
      return showLogin("Your studio session expired. Sign in again.");
    }
    setStatus(manageStatus, error.message, "error");
  }
}

function renderPhotos(photos) {
  if (!photos.length) {
    photoList.innerHTML = '<p class="empty-state">No photos uploaded yet.</p>';
    return;
  }
  photoList.innerHTML = photos.map((photo) => `<figure class="photo-tile">
    <img src="/api/studio/galleries/${activeGallery.id}/photos/${photo.id}" alt="${escapeHtml(photo.originalName)}" loading="lazy" />
    <button class="photo-delete" type="button" aria-label="Delete ${escapeHtml(photo.originalName)}" data-photo-id="${photo.id}">×</button>
  </figure>`).join("");

  photoList.querySelectorAll(".photo-delete").forEach((button) => {
    button.addEventListener("click", () => deletePhoto(button.dataset.photoId));
  });
}

uploadButton.addEventListener("click", async () => {
  if (!activeGallery) return;
  const files = Array.from(photoInput.files || []);
  if (!files.length) return setStatus(manageStatus, "Choose one or more finished photos first.", "error");

  uploadButton.disabled = true;
  uploadProgress.hidden = false;
  uploadProgressBar.max = files.length;
  uploadProgressBar.value = 0;
  setStatus(manageStatus, "Keep this page open while the photographs upload.");
  let completed = 0;
  const failed = [];

  for (const file of files) {
    uploadProgressLabel.textContent = `Uploading ${file.name}`;
    uploadProgressCount.textContent = `${completed + 1} of ${files.length}`;
    const body = new FormData();
    body.append("photo", file, file.name);
    try {
      await api(`/api/studio/galleries/${activeGallery.id}/photos`, { method: "POST", body });
      completed += 1;
      uploadProgressBar.value = completed;
    } catch (error) {
      failed.push(`${file.name}: ${error.message}`);
      uploadProgressBar.value = completed + failed.length;
    }
  }

  uploadButton.disabled = false;
  photoInput.value = "";
  uploadProgressLabel.textContent = "Upload complete";
  uploadProgressCount.textContent = `${completed} uploaded`;
  setStatus(manageStatus, failed.length ? `${completed} uploaded. ${failed.join(" · ")}` : `${completed} photographs uploaded successfully.`, failed.length ? "error" : "success");
  await openGallery(activeGallery.id);
  await loadGalleries();
});

async function deletePhoto(photoId) {
  if (!activeGallery || !confirm("Delete this photograph from the client gallery?")) return;
  try {
    await api(`/api/studio/galleries/${activeGallery.id}/photos/${photoId}`, { method: "DELETE", body: "{}" });
    await openGallery(activeGallery.id);
    await loadGalleries();
  } catch (error) {
    setStatus(manageStatus, error.message, "error");
  }
}

deleteGalleryButton.addEventListener("click", async () => {
  if (!activeGallery) return;
  const confirmed = confirm(`Permanently delete “${activeGallery.title}” and every uploaded photo? This cannot be undone.`);
  if (!confirmed) return;
  deleteGalleryButton.disabled = true;
  try {
    await api(`/api/studio/galleries/${activeGallery.id}`, { method: "DELETE", body: "{}" });
    manageDialog.close();
    activeGallery = null;
    await loadGalleries();
  } catch (error) {
    setStatus(manageStatus, error.message, "error");
  } finally {
    deleteGalleryButton.disabled = false;
  }
});

galleryPin.value = randomPin();
loadGalleries();
