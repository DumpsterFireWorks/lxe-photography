# LXE Photography

Production website for **LXE Photography by Lexus Erickson**.

## Architecture

- Cloudflare Worker with static assets
- Static editorial homepage
- Accessible mobile navigation
- Curated client portfolio
- Session collections and booking policy summary
- Inquiry API with a safe email-app fallback
- Privacy and booking-policy pages
- Security and caching headers

## Business configuration

Edit `config.js` to change the public email, location, inquiry endpoint, or social URLs. Empty social URLs stay hidden.

## Portfolio images

Client work currently lives in:

`public/images/portfolio/`

Use optimized JPEG, WebP, or AVIF files. Keep descriptive filenames, useful alt text, and explicit layout classes in `index.html`.

## Inquiry delivery

The form posts to `/api/inquiry`.

`src/worker.js` is ready to send through Cloudflare Email Service when the `EMAIL` binding is enabled. Until then, the API returns a safe `mailto:` fallback so the visitor can review and send the inquiry from their email application.

To activate direct delivery:

1. Onboard `lxephotography.com` under Cloudflare **Email Service → Email Sending**.
2. Confirm that `hello@lxephotography.com` reaches Lexus.
3. Add the documented `send_email` binding in `wrangler.jsonc`.
4. Deploy and submit a real end-to-end test inquiry.

## Development

```bash
npm install
npm run check
npm run preview
```

## Deployment

```bash
npm run deploy
```

Production branch: `main`
