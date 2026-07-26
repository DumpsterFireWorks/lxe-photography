(() => {
  const grid = document.querySelector(".portfolio-grid");
  const closing = document.querySelector(".portfolio-closing");
  const headingCopy = document.querySelector("#portfolio .section-heading p:last-child");

  if (!grid || !closing || document.querySelector(".portfolio-new-story")) return;

  if (headingCopy) {
    headingCopy.textContent =
      "One family, one engagement, one shoreline, and the honest pieces of a session that cannot be forced.";
  }

  const story = document.createElement("div");
  story.className = "portfolio-new-story reveal";
  story.setAttribute("aria-label", "More from this Lake Michigan engagement story");
  story.innerHTML = `
    <figure>
      <img src="/public/images/portfolio/0395519F-D071-4C9D-BB0C-8AD5A4B259C4.png" alt="Engagement story photographed along the Lake Michigan shoreline" loading="lazy" decoding="async" />
      <figcaption><span>Family &amp; engagement</span><span>Lake Michigan</span></figcaption>
    </figure>
    <figure>
      <img src="/public/images/portfolio/IMG_8719.jpeg" alt="Engagement session photographed along the Lake Michigan shoreline" loading="lazy" decoding="async" />
      <figcaption><span>A joyful yes</span><span>Shoreline</span></figcaption>
    </figure>
  `;

  closing.before(story);
  requestAnimationFrame(() => story.classList.add("visible"));
})();
