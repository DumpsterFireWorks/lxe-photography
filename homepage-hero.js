(() => {
  const dayMs = 24 * 60 * 60 * 1000;
  const rotationDays = 7;
  const rotationStart = Date.UTC(2026, 6, 30);
  const businessDateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const heroes = [
    {
      id: "couples",
      src: "/public/images/portfolio/couples-beach-shore-kiss.jpg",
      alt: "Couple embracing beside the Lake Michigan shoreline",
      width: 1024,
      height: 1280,
      desktopPosition: "50% 48%",
      mobilePosition: "50% 42%"
    },
    {
      id: "portraits",
      src: "/public/images/portfolio/mercedes/woodland-close-portrait.jpeg",
      alt: "Close outdoor portrait in a blue dress beneath the trees",
      width: 1365,
      height: 2048,
      desktopPosition: "50% 22%",
      mobilePosition: "50% 32%"
    },
    {
      id: "motherhood",
      src: "/portfolio/motherhood-newborns/IMG_8924.jpeg",
      alt: "Mother holding her newborn beside the lake in warm natural light",
      width: 1365,
      height: 2048,
      desktopPosition: "50% 24%",
      mobilePosition: "52% 36%"
    },
    {
      id: "families",
      src: "/public/images/portfolio/family-beach-lift.jpg",
      alt: "Family laughing together near the Lake Michigan shoreline",
      width: 1536,
      height: 864,
      desktopPosition: "50% center",
      mobilePosition: "48% center"
    }
  ];

  function businessDateAsUtc(date) {
    const parts = Object.fromEntries(
      businessDateFormatter
        .formatToParts(date)
        .filter(({ type }) => type !== "literal")
        .map(({ type, value }) => [type, Number(value)])
    );
    return Date.UTC(parts.year, parts.month - 1, parts.day);
  }

  const elapsedDays = Math.max(0, Math.floor((businessDateAsUtc(new Date()) - rotationStart) / dayMs));
  const activeHero = heroes[Math.floor(elapsedDays / rotationDays) % heroes.length];

  const preload = document.createElement("link");
  preload.rel = "preload";
  preload.as = "image";
  preload.type = "image/jpeg";
  preload.href = activeHero.src;
  preload.setAttribute("fetchpriority", "high");
  document.head.appendChild(preload);

  function render(slotId) {
    const slot = document.getElementById(slotId);
    if (!slot) return false;

    const image = slot instanceof HTMLImageElement ? slot : document.createElement("img");
    image.className = "hero-image";
    image.src = activeHero.src;
    image.alt = activeHero.alt;
    image.width = activeHero.width;
    image.height = activeHero.height;
    image.loading = "eager";
    image.decoding = "async";
    image.setAttribute("fetchpriority", "high");
    image.dataset.hero = activeHero.id;
    image.style.setProperty("--hero-desktop-position", activeHero.desktopPosition);
    image.style.setProperty("--hero-mobile-position", activeHero.mobilePosition);

    if (image !== slot) slot.replaceWith(image);
    return true;
  }

  window.LXE_HOMEPAGE_HERO = Object.freeze({
    active: Object.freeze({ ...activeHero }),
    render
  });
})();