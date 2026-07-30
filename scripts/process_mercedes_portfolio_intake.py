#!/usr/bin/env python3
from __future__ import annotations

from io import BytesIO
from pathlib import Path
import shutil
import zipfile

from PIL import Image, ImageOps

INTAKE_DIR = Path("portfolio-intake/mercedes-portraits-2026-07")
ZIP_PATH = INTAKE_DIR / "mercedes-portfolio-selected.zip"
PORTFOLIO_PAGE = Path("portfolio/portraits-seniors/index.html")
PUBLIC_DIR = Path("public/images/portfolio/mercedes")
INTAKE_README = Path("portfolio-intake/README.md")
TARGET_SIZE = (1365, 2048)
MAX_WEB_BYTES = 650_000

FILES = {
    "01-mercedes-woodland-close-portrait.jpeg": "woodland-close-portrait.jpeg",
    "02-mercedes-woodland-standing-smile.jpeg": "woodland-standing-smile.jpeg",
    "03-mercedes-lakeside-over-shoulder-portrait.jpeg": "lakeside-over-shoulder-portrait.jpeg",
    "04-mercedes-white-backdrop-standing-portrait.jpeg": "white-backdrop-standing-portrait.jpeg",
    "05-mercedes-white-backdrop-seated-portrait.jpeg": "white-backdrop-seated-portrait.jpeg",
    "06-mercedes-white-backdrop-seated-soft-pose.jpeg": "white-backdrop-seated-soft-pose.jpeg",
}

GALLERY_BLOCK = '''    <section class="gallery-shell"><div class="gallery-grid">
      <figure class="gallery-item third"><img src="/public/images/portfolio/mercedes-blue-dress-full.jpeg" alt="Full outdoor portrait in a blue dress against a white fabric backdrop" width="1283" height="2048" loading="lazy" decoding="async" /><figcaption><span>Portrait</span><span>Soft outdoor styling</span></figcaption></figure>
      <figure class="gallery-item third"><img src="/public/images/portfolio/mercedes/woodland-close-portrait.jpeg" alt="Close outdoor portrait in a blue dress beneath the trees" width="1365" height="2048" loading="lazy" decoding="async" /><figcaption><span>Portrait</span><span>Woodland light</span></figcaption></figure>
      <figure class="gallery-item third"><img src="/public/images/portfolio/mercedes/woodland-standing-smile.jpeg" alt="Smiling full-length outdoor portrait in a blue dress among the trees" width="1365" height="2048" loading="lazy" decoding="async" /><figcaption><span>Portrait</span><span>Relaxed expression</span></figcaption></figure>
      <figure class="gallery-item third"><img src="/public/images/portfolio/mercedes-blue-dress-portrait.jpeg" alt="Close outdoor portrait in warm natural light" width="1365" height="2048" loading="lazy" decoding="async" /><figcaption><span>Portrait</span><span>Natural light</span></figcaption></figure>
      <figure class="gallery-item third"><img src="/public/images/portfolio/mercedes/lakeside-over-shoulder-portrait.jpeg" alt="Portrait in a blue dress looking back beside a quiet lake" width="1365" height="2048" loading="lazy" decoding="async" /><figcaption><span>Portrait</span><span>Lakeside setting</span></figcaption></figure>
      <figure class="gallery-item third"><img src="/public/images/portfolio/mercedes/white-backdrop-standing-portrait.jpeg" alt="Full-length portrait leaning beside a chair against a draped white backdrop" width="1365" height="2048" loading="lazy" decoding="async" /><figcaption><span>Portrait</span><span>Styled backdrop</span></figcaption></figure>
      <figure class="gallery-item third"><img src="/portfolio/04-seated-blue-dress-portrait.jpeg" alt="Relaxed seated portrait in a flowing blue dress beneath the trees" width="1461" height="2048" loading="lazy" decoding="async" /><figcaption><span>Portrait</span><span>Relaxed direction</span></figcaption></figure>
      <figure class="gallery-item third"><img src="/public/images/portfolio/mercedes/white-backdrop-seated-portrait.jpeg" alt="Seated portrait in a blue dress against draped white fabric with flowers" width="1365" height="2048" loading="lazy" decoding="async" /><figcaption><span>Portrait</span><span>Quiet pose</span></figcaption></figure>
      <figure class="gallery-item third"><img src="/public/images/portfolio/mercedes/white-backdrop-seated-soft-pose.jpeg" alt="Seated portrait resting her head on folded arms against a soft white backdrop" width="1365" height="2048" loading="lazy" decoding="async" /><figcaption><span>Portrait</span><span>Soft styling</span></figcaption></figure>
    </div></section>'''

README_TEXT = '''# Portfolio Intake

This folder is a temporary staging area for owner-approved photographs intended for the public LXE Photography portfolio.

## How to use it

1. Create a portfolio branch from the latest `main`.
2. Create one dated session folder inside `portfolio-intake/`.
3. Upload the session ZIP to that branch, never directly to `main`.
4. Tell ChatGPT which branch contains the intake and confirm public portfolio permission.
5. ChatGPT will review the photographs, select the strongest work, create web-optimized copies, place them in the correct portfolio gallery, remove the temporary intake package, run available checks, and open a draft pull request.

## Rules

- Upload only photographs approved for public portfolio use.
- Do not upload private client-gallery originals unless public use is confirmed.
- Do not upload RAW files when finished JPEG exports are available.
- Never upload an intake ZIP directly to `main`.
- Do not modify Studio, client galleries, D1, R2, inquiry delivery, payments, or production configuration as part of portfolio intake.
- Public copies may be resized and compressed for the website, but they must not be regenerated, recolored, retouched, or creatively altered without explicit authorization.
- Rejected photographs and temporary intake files must not remain in the final pull-request tree.
- Existing public portfolio photographs must not be removed unless the owner explicitly requests it.
'''


def find_member(names: list[str], basename: str) -> str:
    matches = [name for name in names if Path(name).name == basename]
    if len(matches) != 1:
        raise RuntimeError(f"Expected exactly one ZIP member named {basename!r}; found {matches}")
    return matches[0]


def optimize_images() -> None:
    if not ZIP_PATH.is_file():
        raise FileNotFoundError(f"Missing intake ZIP: {ZIP_PATH}")

    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(ZIP_PATH) as archive:
        names = archive.namelist()
        for source_name, destination_name in FILES.items():
            member = find_member(names, source_name)
            source_bytes = archive.read(member)
            with Image.open(BytesIO(source_bytes)) as opened:
                image = ImageOps.exif_transpose(opened).convert("RGB")
                image.thumbnail(TARGET_SIZE, Image.Resampling.LANCZOS)
                if image.size != TARGET_SIZE:
                    raise RuntimeError(
                        f"Unexpected optimized dimensions for {source_name}: {image.size}; expected {TARGET_SIZE}"
                    )
                destination = PUBLIC_DIR / destination_name
                image.save(
                    destination,
                    format="JPEG",
                    quality=86,
                    optimize=True,
                    progressive=True,
                    subsampling=2,
                )
                if destination.stat().st_size > MAX_WEB_BYTES:
                    raise RuntimeError(
                        f"Optimized image is over the web budget: {destination} ({destination.stat().st_size} bytes)"
                    )
                with Image.open(destination) as check:
                    if check.size != TARGET_SIZE or check.mode != "RGB":
                        raise RuntimeError(f"Output validation failed for {destination}")
                print(f"Created {destination} ({destination.stat().st_size} bytes)")


def update_portfolio_page() -> None:
    text = PORTFOLIO_PAGE.read_text(encoding="utf-8")
    start_marker = '    <section class="gallery-shell"><div class="gallery-grid">'
    start = text.find(start_marker)
    if start < 0:
        raise RuntimeError("Could not find Portraits & Seniors gallery start marker")
    end_marker = "    </div></section>"
    end = text.find(end_marker, start)
    if end < 0:
        raise RuntimeError("Could not find Portraits & Seniors gallery end marker")
    end += len(end_marker)
    updated = text[:start] + GALLERY_BLOCK + text[end:]
    if updated.count("gallery-item third") != 9:
        raise RuntimeError("Expected exactly nine portrait gallery entries after update")
    for destination_name in FILES.values():
        public_path = f"/public/images/portfolio/mercedes/{destination_name}"
        if updated.count(public_path) != 1:
            raise RuntimeError(f"Expected exactly one page reference to {public_path}")
    PORTFOLIO_PAGE.write_text(updated, encoding="utf-8")


def cleanup_intake() -> None:
    INTAKE_README.write_text(README_TEXT, encoding="utf-8")
    shutil.rmtree(INTAKE_DIR)


def main() -> None:
    optimize_images()
    update_portfolio_page()
    cleanup_intake()
    print("Mercedes portfolio intake processed successfully.")


if __name__ == "__main__":
    main()
