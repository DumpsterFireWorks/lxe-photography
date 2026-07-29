const config = window.LXE_CONFIG || {};
const businessEmail = config.email || "hello@lxephotography.com";
const inquiryEndpoint = config.inquiryEndpoint || "/api/inquiry";

const menuButton = document.querySelector(".menu-button");
const siteNav = document.querySelector(".site-nav");

function addPortalLinks() {
  if (siteNav && !siteNav.querySelector('a[href="/client-galleries/"]')) {
    const clientLink = document.createElement("a");
    clientLink.href = "/client-galleries/";
    clientLink.textContent = "Client Galleries";
    if (window.location.pathname.startsWith("/client-galleries")) clientLink.setAttribute("aria-current", "page");
    const inquiryLink = siteNav.querySelector(".nav-cta");
    siteNav.insertBefore(clientLink, inquiryLink || null);
  }

  const footerNav = document.querySelector(".site-footer nav");
  if (!footerNav) return;

  if (!footerNav.querySelector('a[href="/client-galleries/"]')) {
    const clientLink = document.createElement("a");
    clientLink.href = "/client-galleries/";
    clientLink.textContent = "Client Galleries";
    footerNav.appendChild(clientLink);
  }

  if (!footerNav.querySelector('a[href="/studio/"]')) {
    const studioLink = document.createElement("a");
    studioLink.href = "/studio/";
    studioLink.textContent = "Photographer Login";
    footerNav.appendChild(studioLink);
  }
}

addPortalLinks();

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
  const subject = encodeURIComponent(`LXE Photography inquiry — ${data.session}`);
  const body = encodeURIComponent(buildInquiryBody(data));
  return `mailto:${businessEmail}?subject=${subject}&body=${body}`;
}

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!contactForm.checkValidity()) {
    contactForm.reportValidity();
    return;
  }

  const formData = new FormData(contactForm);
  const payload = Object.fromEntries(formData.entries());
  payload.page = window.location.href;

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
      const fallbackUrl = result.fallbackUrl || buildMailto(payload);
      window.location.href = fallbackUrl;
      setFormStatus("Your email app should open with the inquiry ready. Review it and press send.", "success");
      return;
    }

    contactForm.reset();
    if (startedAt) startedAt.value = String(Date.now());
    setFormStatus("Thank you. Your inquiry was sent to Lexus, and she will follow up personally.", "success");
  } catch (error) {
    window.location.href = buildMailto(payload);
    setFormStatus("Your email app should open with the inquiry ready. Review it and press send.", "success");
  } finally {
    submitButton?.removeAttribute("disabled");
  }
});

const year = document.querySelector("#year");
if (year) year.textContent = String(new Date().getFullYear());
