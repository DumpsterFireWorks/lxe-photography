const config = window.LXE_CONFIG || {};
const businessEmail = config.email || "hello@lxephotography.com";
const inquiryEndpoint = config.inquiryEndpoint || "/api/inquiry";

const menuButton = document.querySelector(".menu-button");
const siteNav = document.querySelector(".site-nav");

function addLinkIfMissing(container, href, text, { beforeSelector = "" } = {}) {
  if (!container || container.querySelector(`a[href="${href}"]`)) return;
  const link = document.createElement("a");
  link.href = href;
  link.textContent = text;
  const before = beforeSelector ? container.querySelector(beforeSelector) : null;
  if (before) before.before(link);
  else container.append(link);
}

function ensurePortalNavigation() {
  addLinkIfMissing(siteNav, "/client-galleries/", "Client Galleries", { beforeSelector: ".nav-cta" });

  const footerNav = document.querySelector(".site-footer nav");
  addLinkIfMissing(footerNav, "/client-galleries/", "Client Galleries", { beforeSelector: 'a[href="/policies.html"]' });
  addLinkIfMissing(footerNav, "/studio/", "Photographer Login", { beforeSelector: 'a[href="/policies.html"]' });
}

ensurePortalNavigation();

function closeMenu({ returnFocus = false } = {}) {
  if (!siteNav || !menuButton) return;
  siteNav.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open navigation");
  if (returnFocus) menuButton.focus();
}

menuButton?.addEventListener("click", () => {
  const open = !siteNav.classList.contains("open");
  siteNav.classList.toggle("open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
});

siteNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => closeMenu());
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && siteNav?.classList.contains("open")) {
    closeMenu({ returnFocus: true });
  }
});

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealItems = document.querySelectorAll(".reveal");

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

const emailLink = document.querySelector("#contact-email");
if (emailLink) {
  emailLink.textContent = businessEmail;
  emailLink.href = `mailto:${businessEmail}`;
}

const locationText = document.querySelector("#contact-location");
if (locationText) locationText.textContent = config.location || "Muskegon, Michigan";

const socialPlatforms = [
  {
    name: "instagram",
    label: "Instagram",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.4" cy="6.7" r="1.15" fill="currentColor"/></svg>'
  },
  {
    name: "tiktok",
    label: "TikTok",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.59 6.69a4.79 4.79 0 0 1-3.77-4.25h-3.11v12.45a2.9 2.9 0 1 1-2.9-2.9c.23 0 .45.03.67.08V8.9a6.03 6.03 0 1 0 5.37 6V8.59a7.9 7.9 0 0 0 3.74.95V6.69Z"/></svg>'
  },
  {
    name: "facebook",
    label: "Facebook",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.8 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5H17V3.9c-.7-.1-1.5-.2-2.3-.2-2.3 0-3.9 1.4-3.9 4V10H8.2v3h2.6v8h3Z"/></svg>'
  }
];

const socialBlock = document.querySelector("#social-block");
const socialContainer = document.querySelector("#social-links");
let activeSocialCount = 0;

if (socialContainer) {
  socialPlatforms.forEach(({ name, label, icon }) => {
    const url = config.socials?.[name];
    if (!url) return;

    const link = document.createElement("a");
    link.className = "social-icon";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", label);
    link.title = label;
    link.innerHTML = icon;
    socialContainer.appendChild(link);
    activeSocialCount += 1;
  });
}

if (socialBlock && activeSocialCount > 0) socialBlock.hidden = false;

const startedAt = document.querySelector("#started-at");
if (startedAt) startedAt.value = String(Date.now());

const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector(".form-status");
const submitButton = contactForm?.querySelector('button[type="submit"]');

function setFormStatus(message, type = "") {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.className = `form-status full-field${type ? ` ${type}` : ""}`;
}

function ensureSelectOption(select, value) {
  if (!select || !value) return;
  if (!Array.from(select.options).some((option) => option.value === value)) {
    select.add(new Option(value, value));
  }
  select.value = value;
}

function localDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function prefillInquiryFromUrl() {
  if (!contactForm) return;

  contactForm.querySelectorAll('input[type="date"]').forEach((input) => {
    input.min = localDateInputValue();
  });

  const params = new URLSearchParams(window.location.search);
  const session = params.get("session") || "";
  const preferredDate = params.get("date") || "";
  const preferredTime = params.get("time") || "";
  const message = params.get("message") || "";

  ensureSelectOption(contactForm.elements.namedItem("session"), session);
  if (preferredDate) contactForm.elements.namedItem("preferredDate").value = preferredDate;
  ensureSelectOption(contactForm.elements.namedItem("preferredTime"), preferredTime);
  if (message) contactForm.elements.namedItem("message").value = message;

  if (session || preferredDate || preferredTime || message) {
    setFormStatus("Your selected session details were added below. Finish the inquiry and press send.", "success");
  }
}

prefillInquiryFromUrl();

function buildInquiryBody(data) {
  return [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone || "Not provided"}`,
    `Session: ${data.session}`,
    `Preferred date: ${data.preferredDate || "Flexible"}`,
    `Preferred time: ${data.preferredTime || "Flexible"}`,
    `Alternate date: ${data.alternateDate || "Not provided"}`,
    "",
    data.message
  ].join("\n");
}

function buildMailto(data) {
  const safeSession = String(data.session || "").replace(/[\r\n]+/g, " ").trim();
  const subject = encodeURIComponent(`LXE Photography inquiry — ${safeSession}`);
  const body = encodeURIComponent(buildInquiryBody(data));
  return `mailto:${businessEmail}?subject=${subject}&body=${body}`;
}

let inquirySubmissionPending = false;

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (inquirySubmissionPending) return;

  if (!contactForm.checkValidity()) {
    contactForm.reportValidity();
    return;
  }

  inquirySubmissionPending = true;
  const formData = new FormData(contactForm);
  const payload = Object.fromEntries(formData.entries());
  payload.page = `${window.location.origin}${window.location.pathname}`;

  submitButton?.setAttribute("disabled", "");
  setFormStatus("Sending your inquiry…");

  try {
    const response = await fetch(inquiryEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if ([502, 503].includes(response.status)) {
        const fallbackUrl = result.fallbackUrl || buildMailto(payload);
        window.location.href = fallbackUrl;
        setFormStatus("Your email app should open with the inquiry ready. Review it and press send.", "success");
        return;
      }

      setFormStatus(result.error || "The inquiry could not be sent. Please check the form and try again.", "error");
      return;
    }

    contactForm.reset();
    if (startedAt) startedAt.value = String(Date.now());
    setFormStatus("Thank you. Your inquiry was sent to Lexus, and she will follow up personally.", "success");
  } catch {
    window.location.href = buildMailto(payload);
    setFormStatus("Your email app should open with the inquiry ready. Review it and press send.", "success");
  } finally {
    inquirySubmissionPending = false;
    submitButton?.removeAttribute("disabled");
  }
});

const year = document.querySelector("#year");
if (year) year.textContent = String(new Date().getFullYear());
