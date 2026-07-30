#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import shutil

from PIL import Image, ImageOps

BRANCH_INTAKE = Path("portfolio-intake")
PUBLIC_DIR = Path("public/images/portfolio/seasonal")
MINIS_PAGE = Path("portfolio/minis-seasonal/index.html")
PORTFOLIO_PAGE = Path("portfolio/index.html")
MAX_SIZE = (1365, 2048)
MAX_BYTES = 650_000

FILES = {
    "01-kiya-back-to-school-hero.JPG": "back-to-school-chair-books.jpg",
    "02-kiya-reading-with-books-and-pencils.JPG": "back-to-school-reading.jpg",
    "03-kiya-close-back-to-school-portrait.JPG": "back-to-school-close-portrait.jpg",
    "04-kiya-standing-back-to-school-portrait.JPG": "back-to-school-standing-portrait.jpg",
}

MINIS_HTML = '''<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Back to school and seasonal mini-session photography by LXE Photography in Muskegon and West Michigan." />
  <meta name="theme-color" content="#f4efe6" />
  <meta property="og:title" content="Back to School &amp; Seasonal Photography | LXE Photography" />
  <meta property="og:description" content="Warm, personality-filled Back to School and seasonal portraits by LXE Photography in Muskegon and West Michigan." />
  <meta property="og:url" content="https://lxephotography.com/portfolio/minis-seasonal/" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://lxephotography.com/public/images/portfolio/seasonal/back-to-school-chair-books.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Back to School &amp; Seasonal Photography | LXE Photography" />
  <meta name="twitter:description" content="Warm, personality-filled Back to School and seasonal portraits by LXE Photography in Muskegon and West Michigan." />
  <meta name="twitter:image" content="https://lxephotography.com/public/images/portfolio/seasonal/back-to-school-chair-books.jpg" />
  <title>Back to School &amp; Seasonal Photography | LXE Photography</title>
  <link rel="canonical" href="https://lxephotography.com/portfolio/minis-seasonal/" />
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://lxephotography.com/"},{"@type":"ListItem","position":2,"name":"Portfolio","item":"https://lxephotography.com/portfolio/"},{"@type":"ListItem","position":3,"name":"Minis & Seasonal","item":"https://lxephotography.com/portfolio/minis-seasonal/"}]}</script>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600&family=Italiana&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/site.css?v=20260729-7" />
  <link rel="stylesheet" href="/pages.css?v=20260730-2" />
  <script defer src="/config.js?v=20260729-4"></script><script defer src="/script.js?v=20260729-7"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a><div class="announcement" role="region" aria-label="Site announcement">Back to school and seasonal portraits · Muskegon and West Michigan</div>
  <header class="site-header"><a class="brand" href="/" aria-label="LXE Photography home"><span class="brand-mark">LXE</span><span class="brand-sub">PHOTOGRAPHY</span></a><button class="menu-button" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Open navigation"><span></span><span></span><span></span></button><nav id="site-nav" class="site-nav" aria-label="Main navigation"><a href="/">Home</a><a href="/portfolio/" aria-current="page">Portfolio</a><a href="/sessions/">Sessions</a><a href="/about/">About</a><a href="/client-galleries/">Client Galleries</a><a class="nav-cta" href="/contact/">Inquire</a></nav></header>
  <main id="main" class="page-main">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="/portfolio/">Portfolio</a></li><li><span aria-current="page">Minis &amp; Seasonal</span></li></ol></nav>
    <section class="page-hero"><img src="/public/images/portfolio/seasonal/back-to-school-chair-books.jpg" alt="Young student resting on books beside a Back to School chalkboard" width="1365" height="1706" loading="eager" fetchpriority="high" decoding="async" /><div class="page-hero-copy"><p class="eyebrow light">Back to school</p><h1>A fresh year.<br /><em>Their real personality.</em></h1><p>Simple seasonal styling, familiar school details, and relaxed direction create portraits that feel polished without losing who they are.</p></div></section>
    <section class="page-heading"><p class="eyebrow">Seasonal stories</p><h2>Small details.<br /><em>A milestone worth keeping.</em></h2><p>Back to School portraits celebrate the excitement, personality, and little changes that arrive with every new school year. Future limited and seasonal collections will grow here as Lexus photographs them.</p></section>
    <section class="gallery-shell"><div class="gallery-grid">
      <figure class="gallery-item third"><img src="/public/images/portfolio/seasonal/back-to-school-reading.jpg" alt="Young student reading an open book beside a cup of pencils" width="1365" height="2048" loading="lazy" decoding="async" /><figcaption><span>Back to school</span><span>Storytelling details</span></figcaption></figure>
      <figure class="gallery-item third"><img src="/public/images/portfolio/seasonal/back-to-school-close-portrait.jpg" alt="Young student smiling with her arms folded over a chair" width="1365" height="2048" loading="lazy" decoding="async" /><figcaption><span>Portrait</span><span>Personality</span></figcaption></figure>
      <figure class="gallery-item third"><img src="/public/images/portfolio/seasonal/back-to-school-standing-portrait.jpg" alt="Young student smiling outdoors in a brown dress and cream cardigan" width="1365" height="2048" loading="lazy" decoding="async" /><figcaption><span>Seasonal portrait</span><span>Natural expression</span></figcaption></figure>
    </div></section>
    <section class="simple-split muted-section"><div><p class="eyebrow">Back to School portraits</p><h2>Styled with intention.<br /><em>Still completely them.</em></h2></div><div><p>Books, pencils, classic school details, and a comfortable setup create a finished seasonal portrait without making the session feel stiff or overdone.</p><a class="text-link" href="/contact/?session=Back%20to%20School%20Portraits">Ask Lexus about Back to School portraits <span aria-hidden="true">→</span></a></div></section>
    <section class="page-cta"><div><p class="eyebrow light">Limited and seasonal</p><h2>Ask what Lexus is planning next.</h2></div><a class="button button-light" href="/contact/">Inquire about a seasonal session</a></section>
  </main>
  <footer class="site-footer"><div class="footer-brand"><span class="brand-mark">LXE</span><span class="brand-sub">PHOTOGRAPHY</span><small>by Lexus Erickson</small></div><nav aria-label="Footer navigation"><a href="/">Home</a><a href="/portfolio/">Portfolio</a><a href="/sessions/">Sessions</a><a href="/about/">About</a><a href="/client-galleries/">Client Galleries</a><a href="/contact/">Inquire</a><a href="/studio/">Photographer Login</a><a href="/policies.html">Policies</a><a href="/privacy.html">Privacy</a><a href="https://www.facebook.com/LXEPhotography/" target="_blank" rel="noopener noreferrer">Facebook</a></nav><p>© <span id="year"></span> LXE Photography. All rights reserved.</p></footer>
</body>
</html>
'''


def optimize_image(source: Path, destination: Path) -> tuple[int, int, int]:
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB")
        image.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)
        destination.parent.mkdir(parents=True, exist_ok=True)
        for quality in (86, 82, 78, 74):
            image.save(destination, format="JPEG", quality=quality, optimize=True, progressive=True, subsampling=2)
            if destination.stat().st_size <= MAX_BYTES:
                break
        else:
            raise RuntimeError(f"Unable to keep {destination} under {MAX_BYTES} bytes")
        return image.width, image.height, destination.stat().st_size


def update_portfolio_card() -> None:
    source = PORTFOLIO_PAGE.read_text(encoding="utf-8")
    source = source.replace(
        '/public/images/portfolio/seasonal/back-to-school-portrait.jpg" alt="Young student posing with books and a Back to School chalkboard" width="900" height="1125"',
        '/public/images/portfolio/seasonal/back-to-school-chair-books.jpg" alt="Young student resting on books beside a Back to School chalkboard" width="1365" height="1706"',
    )
    if "back-to-school-chair-books.jpg" not in source:
        raise RuntimeError("Portfolio Back to School card was not updated")
    PORTFOLIO_PAGE.write_text(source, encoding="utf-8")


def main() -> None:
    results = {}
    for source_name, destination_name in FILES.items():
        source = BRANCH_INTAKE / source_name
        if not source.is_file():
            raise FileNotFoundError(f"Missing intake image: {source}")
        results[destination_name] = optimize_image(source, PUBLIC_DIR / destination_name)

    expected = {
        "back-to-school-chair-books.jpg": (1365, 1706),
        "back-to-school-reading.jpg": (1365, 2048),
        "back-to-school-close-portrait.jpg": (1365, 2048),
        "back-to-school-standing-portrait.jpg": (1365, 2048),
    }
    for name, dimensions in expected.items():
        if results[name][:2] != dimensions:
            raise RuntimeError(f"Unexpected dimensions for {name}: {results[name][:2]} expected {dimensions}")

    MINIS_PAGE.write_text(MINIS_HTML, encoding="utf-8")
    update_portfolio_card()

    for source_name in FILES:
        (BRANCH_INTAKE / source_name).unlink()
    readme = BRANCH_INTAKE / "README.txt"
    if readme.exists():
        readme.unlink()
    upload_marker = PUBLIC_DIR / "UPLOAD-HERE.md"
    if upload_marker.exists():
        upload_marker.unlink()

    print("Processed Back to School portfolio photographs:")
    for name, (width, height, size) in results.items():
        print(f"- {name}: {width}x{height}, {size} bytes")


if __name__ == "__main__":
    main()
