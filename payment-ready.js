(() => {
  const config = window.LXE_CONFIG || {};
  const payments = config.payments || {};

  function setupPayments() {
    const currentPaymentDetails = document.querySelector(".confirmed-payment");
    if (!currentPaymentDetails) return;

    const wrapper = document.createElement("div");
    wrapper.className = "payment-options";
    wrapper.innerHTML = `
      <div class="secure-payment">
        <p class="payment-kicker">Payment after confirmation</p>
        <h3>Simple, secure retainer payment.</h3>
        <p id="payment-status">After Lexus confirms your date, she will send the approved payment instructions privately. A secure Square checkout for card and mobile-wallet payments is being prepared.</p>
        <a id="square-payment-link" class="button button-dark square-payment-link" href="#" target="_blank" rel="noopener noreferrer" hidden>Pay the $25 retainer securely</a>
        <p id="square-payment-methods" class="payment-methods" hidden>Square checkout · card · Apple Pay · Google Pay</p>
      </div>
      <details class="confirmed-payment">
        <summary>Cash App backup for confirmed clients</summary>
        <div class="retainer-payment">
          <a id="cash-app-payment-link" class="cash-app-button" href="${payments.cashAppUrl || "https://cash.app/$lexuslynnh"}" target="_blank" rel="noopener noreferrer" aria-label="Pay the confirmed LXE Photography retainer through Cash App">
            <span class="cash-app-mark" aria-hidden="true">$</span>
            <span><small>Backup payment option</small><strong>${payments.cashAppHandle || "$lexuslynnh"}</strong></span>
          </a>
          <p class="retainer-note">Use only after Lexus confirms your date. Include your name and session date in the note. Cash App may display the account name “${payments.cashAppAccountName || "Lexus Hilton"}.”</p>
        </div>
      </details>
    `;

    currentPaymentDetails.replaceWith(wrapper);

    if (!payments.squareRetainerUrl) return;

    const squareLink = wrapper.querySelector("#square-payment-link");
    const methods = wrapper.querySelector("#square-payment-methods");
    const status = wrapper.querySelector("#payment-status");

    squareLink.href = payments.squareRetainerUrl;
    squareLink.hidden = false;
    methods.hidden = false;
    status.textContent =
      "Use this link only after Lexus confirms your date. The $25 retainer applies toward the session total.";
  }

  function setupSaturdayMinis() {
    const expiresAt = new Date("2026-08-02T00:00:00-04:00");
    if (Date.now() >= expiresAt.getTime()) return;
    if (document.querySelector("#saturday-minis")) return;

    const insertAfter = document.querySelector(".brand-statement");
    if (!insertAfter) return;

    const slots = [
      "7:00 PM", "7:10 PM", "7:20 PM", "7:30 PM",
      "7:40 PM", "7:50 PM", "8:00 PM", "8:10 PM",
      "8:20 PM", "8:30 PM", "8:40 PM", "8:50 PM"
    ];

    const section = document.createElement("section");
    section.id = "saturday-minis";
    section.className = "saturday-mini-special section-anchor reveal visible";
    section.innerHTML = `
      <div class="saturday-mini-visual">
        <img src="/public/images/portfolio/IMG_8719.jpeg" alt="A joyful engagement moment photographed along the Lake Michigan shoreline" width="1365" height="2048" loading="lazy" decoding="async" />
        <div class="saturday-mini-badge">Saturday only</div>
      </div>
      <div class="saturday-mini-copy">
        <p class="eyebrow">Hosted by Lexus + Lexus</p>
        <h2>Golden Hour Minis<br /><em>this Saturday.</em></h2>
        <p class="saturday-mini-date">Saturday, August 1 · 7:00–9:00 PM · Muskegon area</p>
        <div class="saturday-mini-facts" role="list" aria-label="Golden hour mini session details">
          <div role="listitem"><strong>$60</strong><span>session</span></div>
          <div role="listitem"><strong>10 min</strong><span>photography</span></div>
          <div role="listitem"><strong>10+</strong><span>edited photos</span></div>
        </div>
        <p>Perfect for couples, families, kids, maternity, best friends, or a quick portrait update. Sessions run back-to-back, so please arrive a few minutes early.</p>
        <p class="saturday-slot-label">Choose a time to request:</p>
        <div class="saturday-slot-grid">
          ${slots.map((slot) => `<button type="button" class="saturday-slot" data-slot="${slot}" aria-pressed="false">${slot}</button>`).join("")}
        </div>
        <p class="saturday-slot-status" role="status" aria-live="polite" aria-atomic="true"></p>
        <p class="saturday-mini-note">A time is not reserved until Lexus confirms it and receives the $25 retainer. Exact location details are provided after confirmation.</p>
      </div>
    `;

    insertAfter.after(section);

    const announcement = document.querySelector(".announcement");
    if (announcement) {
      announcement.textContent = "Saturday Golden Hour Minis · August 1 · 7–9 PM · $60 · 10 minutes · 10+ photos";
    }

    const contactForm = document.querySelector("#contact-form");
    const slotStatus = section.querySelector(".saturday-slot-status");

    function chooseSlot(slot, selectedButton) {
      const sessionName = "Saturday Golden Hour Mini";
      const message = `Saturday golden-hour mini request for ${slot}. Session is for: `;

      section.querySelectorAll(".saturday-slot").forEach((slotButton) => {
        const selected = slotButton === selectedButton;
        slotButton.classList.toggle("selected", selected);
        slotButton.setAttribute("aria-pressed", String(selected));
      });

      if (slotStatus) {
        slotStatus.textContent = `${slot} selected. Opening the inquiry form so Lexus can confirm it.`;
      }

      if (!contactForm) {
        const inquiryUrl = new URL("/contact/", window.location.origin);
        inquiryUrl.searchParams.set("session", sessionName);
        inquiryUrl.searchParams.set("date", "2026-08-01");
        inquiryUrl.searchParams.set("time", slot);
        inquiryUrl.searchParams.set("message", message);
        window.location.assign(inquiryUrl.toString());
        return;
      }

      const sessionSelect = contactForm.elements.namedItem("session");
      const dateInput = contactForm.elements.namedItem("preferredDate");
      const timeSelect = contactForm.elements.namedItem("preferredTime");
      const messageInput = contactForm.elements.namedItem("message");
      const nameInput = contactForm.elements.namedItem("name");

      if (sessionSelect && !Array.from(sessionSelect.options).some((option) => option.value === sessionName)) {
        sessionSelect.add(new Option(sessionName, sessionName));
      }
      if (sessionSelect) sessionSelect.value = sessionName;
      if (dateInput) dateInput.value = "2026-08-01";

      if (timeSelect && !Array.from(timeSelect.options).some((option) => option.value === slot)) {
        timeSelect.add(new Option(slot, slot));
      }
      if (timeSelect) timeSelect.value = slot;
      if (messageInput) messageInput.value = message;

      contactForm.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => nameInput?.focus(), 550);
    }

    section.querySelectorAll(".saturday-slot").forEach((button) => {
      button.addEventListener("click", () => {
        const slot = button.dataset.slot;
        if (slot) chooseSlot(slot, button);
      });
    });
  }

  setupPayments();
  setupSaturdayMinis();
})();
