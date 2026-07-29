# LXE Photography

Production website for **LXE Photography by Lexus Erickson** in Muskegon and West Michigan.

## Architecture

- Cloudflare Worker with static website assets
- Multi-page photography portfolio and session pricing
- Inquiry API with direct email delivery and a safe email-app fallback
- Private photographer studio with emailed one-time sign-in codes
- Private client galleries protected by a gallery code and four-digit PIN
- Cloudflare D1 for gallery, authentication, abuse-prevention, and expiration records
- Private Cloudflare R2 storage for finished client photographs
- Individual photograph downloads and device-safe ZIP downloads
- Automatic gallery expiration after 30 days and scheduled deletion
- Security headers, source-file route blocking, and abuse throttling

## Business configuration

Edit `config.js` to change the public email, location, payment links, or social URLs. Empty social URLs stay hidden.

Never commit real secrets. `GALLERY_AUTH_SECRET` belongs in Cloudflare as an encrypted Worker secret.

## Portfolio images

Public portfolio work currently lives in:

- `public/images/portfolio/`
- `portfolio/`
- category-specific portfolio folders

Use descriptive filenames and useful alt text. Prefer optimized JPEG, WebP, or AVIF files. The automated audit warns when a public image is larger than 2 MB so oversized web copies can be reviewed.

Only publish client photographs after delivery and the appropriate client or parent/guardian permission.

## Private client delivery

Lexus signs in at:

```text
https://lxephotography.com/studio/
```

Customers can use either the private link Lexus sends or the public access page:

```text
https://lxephotography.com/client-galleries/
```

A customer needs both the unique gallery code and four-digit PIN. R2 public access must remain disabled. Upload only final edited photographs intended for delivery; do not upload RAW files, unfinished proofs, duplicates, or images awaiting approval.

Every gallery becomes inaccessible exactly 30 days after creation. The hourly Worker trigger removes expired D1 records and R2 objects. An R2 lifecycle rule may be used as a backup, but it must not delete files before the Worker’s 30-day expiration.

## Inquiry delivery

The contact form posts to `/api/inquiry`. The Worker sends the inquiry to Lexus through the `EMAIL` binding. When direct website delivery is temporarily unavailable, the browser opens a prepared email so the visitor can review and send it.

Inquiry attempts are throttled in D1. The form also uses a honeypot, a minimum completion time, server-side validation, and a required booking acknowledgement.

## Cloudflare bindings

The production Worker expects:

- `ASSETS`
- `EMAIL`
- `GALLERY_DB`
- `GALLERY_BUCKET`
- encrypted secret `GALLERY_AUTH_SECRET`

Before changing the D1 section of `wrangler.jsonc`, verify the real production database name and UUID with Cloudflare. Do not guess or replace the existing production binding with a newly provisioned database.

## Development

```bash
npm install
npm run check
npm run audit
npm run preview
```

Run the complete non-destructive verification suite with:

```bash
npm run verify
```

That command checks JavaScript syntax, audits static routes/assets/accessibility basics, and performs a Wrangler dry-run build.

## Deployment

```bash
npm run deploy
```

Production branch: `main`
