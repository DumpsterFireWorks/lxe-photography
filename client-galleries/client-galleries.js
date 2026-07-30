const form = document.querySelector("#gallery-access-form");
const codeInput = document.querySelector("#gallery-code");
const pinInput = document.querySelector("#gallery-pin");
const status = document.querySelector("#gallery-access-status");
const gallerySubmitButton = form?.querySelector('button[type="submit"]');

function setStatus(message = "", type = "") {
  if (!status) return;
  status.textContent = message;
  status.className = `gallery-access-status${type ? ` ${type}` : ""}`;
}

function normalizeGalleryCode(value) {
  let candidate = String(value || "").trim();
  if (!candidate) return "";

  try {
    const parsed = new URL(candidate);
    candidate = parsed.pathname;
  } catch {
    candidate = candidate.split(/[?#]/, 1)[0];
  }

  candidate = candidate
    .replace(/^\/+/, "")
    .replace(/^gallery\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return candidate;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const slug = normalizeGalleryCode(codeInput.value);
  const pin = pinInput.value.trim();

  if (!slug) {
    setStatus("Enter the gallery code from the link Lexus sent you.", "error");
    codeInput.focus();
    return;
  }

  gallerySubmitButton.disabled = true;
  setStatus("Opening your private gallery…");

  try {
    const response = await fetch(`/api/client-gallery/${encodeURIComponent(slug)}/unlock`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 410) throw new Error("This gallery has expired. Contact Lexus if you still need your photographs.");
      if (response.status === 429) throw new Error(data.error || "Too many attempts. Please wait and try again.");
      throw new Error("The gallery code or PIN is not correct. Check the message Lexus sent you and try again.");
    }

    window.location.assign(`/gallery/${encodeURIComponent(slug)}`);
  } catch (error) {
    setStatus(error.message || "We couldn’t open the gallery. Please try again.", "error");
    pinInput.select();
  } finally {
    gallerySubmitButton.disabled = false;
  }
});
