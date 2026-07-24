# LXE Photography

Official website repository for **LXE Photography by Lexus Erickson**.

## Current site

The first responsive website foundation includes:

- Home, About, Portfolio, Services, Investment, and Contact sections
- Desktop and mobile navigation
- Editable social, email, booking, and location settings
- Filterable portfolio layout
- Email-based inquiry form
- Cloudflare Pages-compatible static hosting
- Baseline security headers
- Accessible semantic markup and reduced JavaScript dependencies

## Update business details and social links

Edit `config.js`:

```js
window.LXE_CONFIG = {
  businessName: "LXE Photography",
  photographer: "Lexus Erickson",
  location: "Muskegon, Michigan",
  email: "hello@lxephotography.com",
  phone: "",
  bookingUrl: "",
  socials: {
    instagram: "",
    facebook: "",
    tiktok: "",
    pinterest: ""
  }
};
```

Paste the complete `https://` URL for each social profile. Empty entries remain hidden.

## Add portfolio photos

1. Create `assets/images/`.
2. Upload optimized `.webp` photographs.
3. Replace the temporary `.photo-placeholder` blocks in `index.html` with images, for example:

```html
<figure class="portfolio-item" data-category="portrait">
  <img src="assets/images/portrait-01.webp" alt="Natural-light senior portrait in a field" loading="lazy" />
  <figcaption>Portraits</figcaption>
</figure>
```

Recommended export settings:

- WebP format
- 1600–2200 pixels on the long edge
- 75–85 quality
- Descriptive filenames and alt text

## Cloudflare Pages deployment

1. In Cloudflare, open **Workers & Pages**.
2. Select **Create application → Pages → Connect to Git**.
3. Choose `kool1160/lxe-photography`.
4. Production branch: `main`.
5. Framework preset: `None`.
6. Build command: leave blank.
7. Build output directory: `/`.
8. Deploy.

Cloudflare will create a free `pages.dev` address. A custom domain can be connected afterward from the Pages project under **Custom domains**.

## Local preview

Because the site is static, open `index.html` directly or run:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Branch workflow

- `main` is the production branch.
- Build changes on feature branches.
- Review through pull requests before merging.
