(() => {
  const config = window.LXE_CONFIG || {};
  const payments = config.payments || {};
  const currentPaymentDetails = document.querySelector(".confirmed-payment");

  if (!currentPaymentDetails) return;

  const wrapper = document.createElement("div");
  wrapper.className = "payment-options";
  wrapper.innerHTML = `
    <div class="secure-payment">
      <p class="payment-kicker">Payment after confirmation</p>
      <h4>Simple, secure retainer payment.</h4>
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
})();
