# LXE Photography launch checklist

## Release status

The current release candidate has a strong technical baseline: all 15 routes in `sitemap.xml` load successfully, the public inquiry and gallery-entry interfaces behave correctly under local mocked success and failure responses, public metadata is complete and internally consistent, private routes remain non-indexable, security headers are present, and the merged Milestones 3A and 3B image-performance and accessibility protections remain intact.

Milestone 4A verified the repository audit, the current production site, real Edge and Chrome rendering, responsive layouts, keyboard workflows, security headers, production indexing controls, and mobile and desktop Lighthouse spot checks. It also corrected a public Content Security Policy mismatch that blocked Cloudflare's automatically injected Web Analytics beacon and produced a browser console error.

The Milestone 4A change is suitable to merge after code review and successful CI/Cloudflare preview verification. The website should not receive final launch sign-off until the manual owner tasks below are complete. Milestone 2B recovery is now merged, and direct inquiry receipt is owner-confirmed in production.

Known limitations:

- Physical Safari, a physical iPhone, VoiceOver, and true 200% browser zoom were not available in this Windows environment.
- Production receipt at `hello@lxephotography.com` is owner-confirmed. Production Reply-To and spam-folder behavior were not separately confirmed in Milestone 4B.
- No real client gallery was unlocked or downloaded.
- The About portrait is approximately 4.1 MB and another public portfolio image is approximately 2.8 MB. Reducing those bytes requires a separately authorized image-processing task.
- Wrangler 4.114 on Windows crashed its disposable local proxy when a D1-backed inquiry-rate-limit request was attempted. Non-mutating method, honeypot, and size guards were verified locally; deeper D1-backed behavior remains covered by source review, CI, and the required owner test.

No manual production deployment was performed in Milestone 4A.

## Direct inquiry status

Direct inquiry delivery is enabled through the existing destination-restricted `EMAIL` binding. The Worker sends validated inquiries to `hello@lxephotography.com` and uses the validated prospective-client email as Reply-To. The owner confirmed that production receipt is working; the date of the latest live test was not supplied. Reply-To is confirmed by implementation review and mocked delivery tests, but was not independently confirmed in the production inbox during Milestone 4B. Missing-binding and send-failure fallbacks were verified with mocked responses and browser QA. No new production inquiry was sent during this task.

Operational behavior:

- **Direct-delivery success:** the endpoint returns success, the form announces that the inquiry was sent, resets, and does not open the visitor's mail application.
- **Validation failure:** the endpoint returns a customer-readable validation error; the form retains the inquiry details and restores the submit button.
- **Rate limiting:** the endpoint returns a 15-minute wait message without attempting delivery.
- **Binding unavailable:** the endpoint returns a prepared `mailto:` fallback containing the visitor's inquiry details.
- **Send failure:** the endpoint returns the same safe fallback without exposing the provider error, stack trace, binding details, or secrets.
- **Mail-app fallback:** the form opens the prepared message, announces that the visitor must review it and press send, and restores the submit button.

Safe troubleshooting:

1. Confirm the response shown beside the browser form.
2. Check the Lexus inbox and spam folder.
3. Confirm the `EMAIL` binding still exists.
4. Confirm the destination remains authorized.
5. Inspect Worker logs without copying personal inquiry contents.
6. Test only with clearly fake data.
7. Open a focused GitHub issue for any defect.

## Completed technical checks

### Public routes

The following `sitemap.xml` routes were inspected:

- `/`
- `/portfolio/`
- `/portfolio/families/`
- `/portfolio/couples-engagements/`
- `/portfolio/portraits-seniors/`
- `/portfolio/children-lifestyle/`
- `/portfolio/motherhood-newborns/`
- `/portfolio/minis-seasonal/`
- `/portfolio/pets-lifestyle/`
- `/sessions/`
- `/about/`
- `/contact/`
- `/client-galleries/`
- `/policies.html`
- `/privacy.html`

All returned successfully in the current production read-only check and in local browser QA. Across 75 Edge/Chrome route and viewport visits, there were no broken images, failed asset requests, horizontal overflow, missing page-level headings, missing primary landmarks, or runtime console errors in the repository build. The public 404 response returned status 404, included `noindex`, and provided a route back home.

### Navigation

Internal links and fragment targets passed the repository audit. Mobile navigation opened with touch and keyboard, updated `aria-expanded` and its accessible name, moved Tab focus into the menu, closed with Escape, and returned focus to the menu button. `/sessions/#faq` resolved to the FAQ section, and native FAQ disclosures opened from the keyboard with a 44px summary target.

### Inquiry form behavior

Required native validation focused the first invalid field. Preferred and alternate dates used the current local minimum and rejected a past date. Mocked browser responses verified the success message, error message, polite atomic live region, form reset after success, and re-enabled submit button after success or failure. The Worker method guard returned 405, the honeypot returned a neutral 200 without delivery, and the request-size guard returned 413 in the disposable local runtime.

Milestone 4B preserved the direct-delivery and mail-app fallback architecture. Production receipt is owner-confirmed; all delivery tests in this task were mocked, and no new production inquiry was submitted.

### Client Galleries behavior

The public access form exposed programmatic labels, native required validation, a numeric four-digit PIN input, a disabled submit state during requests, polite atomic status messaging, and predictable PIN focus after a mocked error. Studio, gallery, API, source, documentation, and environment-style paths retained their private-route protections. No production gallery was unlocked and no real client photograph was requested or downloaded.

### SEO metadata and canonical URLs

The audit verified unique titles, descriptions, and canonical URLs for the major public pages. Open Graph and Twitter titles and descriptions match each page's primary metadata, Open Graph URLs match canonicals, card types are correct, and all selected social images resolve successfully. No duplicate canonical URL was found.

### Sitemap and robots directives

`https://lxephotography.com/sitemap.xml` returned 200 and listed the 15 intended public routes without Studio, galleries, or APIs. `https://lxephotography.com/robots.txt` returned 200, referenced the production sitemap, and disallowed `/studio/`, `/gallery/`, and `/api/`.

### Structured data and breadcrumbs

The homepage `ProfessionalService` JSON-LD parsed successfully and remains the established business structured data. JSON-LD encountered during the audit parsed without errors. Visible portfolio breadcrumbs and matching `BreadcrumbList` JSON-LD are present following the merged Milestone 2B recovery work.

### Social sharing metadata

Representative production metadata was inspected for Home, Portfolio, Families, Couples & Engagements, Portraits & Seniors, Motherhood & Newborns, Sessions, About, Contact, Client Galleries, Policies, and Privacy. Each had the expected Open Graph and Twitter fields, and every referenced share image returned 200.

### Accessibility and keyboard behavior

All sitemap routes retained one H1 and the expected header, main, and footer landmarks. The Edge desktop axe-core 4.12.1 pass reported zero violations across all 15 routes. Skip links, focus visibility, active-page indicators, mobile menu focus, FAQ disclosures, form labels, native validation, and live-region behavior were inspected. Automated structural checks do not constitute a complete WCAG or assistive-technology audit.

### Responsive layouts

All sitemap routes were inspected in Edge at 390×844, 768×1024, and 1440×1000, and in Chrome at 390×844 and 1440×1000. No horizontal overflow, missing content, broken image, console error, or failed request was found.

### Image loading

The audit confirmed intrinsic dimensions, valid loading and decoding values, no more than one high-priority image per page, intended eager hero loading, lazy below-the-fold loading, valid responsive-image references, and no regression from Milestone 3A. The homepage family shoreline image remained the likely LCP element.

### Performance observations

Lighthouse 13.4.1 spot checks against the current production homepage measured:

- Mobile: Performance 90, Accessibility 100, SEO 100, Best Practices 92, LCP 2.9 s, CLS 0, TBT 0 ms.
- Desktop: Performance 100, Accessibility 100, SEO 100, Best Practices 92, LCP 0.6 s, CLS 0.001, TBT 0 ms.

The Best Practices reduction was caused by the Cloudflare Web Analytics script being blocked by the public CSP. Milestone 4A applies Cloudflare's narrowly scoped documented script and connection allowlists. These production measurements are the release baseline, not a claim of improvement on an undeployed change.

The Cloudflare branch preview measured:

- Mobile: Performance 98, Accessibility 100, Best Practices 100, LCP 2.1 s, CLS 0, TBT 0 ms.
- Desktop: Performance 100, Accessibility 100, Best Practices 100, LCP 0.5 s, CLS 0.001, TBT 0 ms.

The preview's SEO score was 69 because Cloudflare correctly sends `X-Robots-Tag: noindex` on branch previews. Preview timing can differ from production, so these measurements confirm the absence of a regression and the corrected Best Practices finding rather than a guaranteed production performance improvement.

### Security headers

The live homepage returned:

- Content-Security-Policy
- Strict-Transport-Security with a one-year `max-age` and `includeSubDomains`
- Referrer-Policy
- Permissions-Policy
- X-Content-Type-Options: `nosniff`
- X-Frame-Options: `DENY`
- Cross-Origin-Opener-Policy
- Cross-Origin-Resource-Policy

The `www` hostname redirected permanently to the canonical apex hostname. The Milestone 4A CSP change preserves all existing directives and adds only Cloudflare's documented Web Analytics origins.

### Private-route indexing protection

Production read-only checks confirmed `X-Robots-Tag: noindex, nofollow, noarchive` on Studio, client-gallery, API, blocked source, and blocked documentation routes. Studio and client-gallery HTML also retained page-level `noindex`. Blocked source and documentation paths returned 404.

### GitHub CI and Cloudflare preview build

GitHub's `validate` workflow and the Cloudflare Workers build passed for the Milestone 4A branch.

Branch preview:

`https://release-milestone-4a-launch-readiness-lxe-photography.chris-5a6.workers.dev`

The preview was inspected across all sitemap routes in Edge and Chrome. It had no status failures, broken images, failed requests, horizontal overflow, console errors, or axe violations. The public CSP allowed a controlled Cloudflare Web Analytics script probe without a violation, all required security headers remained present, and Studio, gallery, API, source, and documentation routes remained `noindex`. No production deployment was performed.

## Manual owner tasks before or shortly after launch

- Test the live site on a physical iPhone.
- Test the live site in Safari.
- Test primary workflows with VoiceOver.
- Confirm true 200% browser zoom behavior.
- Confirm production Reply-To behavior and periodically recheck delivery to `hello@lxephotography.com` with clearly fake test data.
- Confirm a real client gallery can be opened and downloaded using a test gallery owned by LXE Photography.
- Connect or verify Google Search Console.
- Submit `https://lxephotography.com/sitemap.xml`.
- Connect or verify Bing Webmaster Tools.
- Create or finish the Google Business Profile.
- Add the verified business Instagram URL only after the account exists and is confirmed.
- Confirm Facebook sharing displays the intended title, description, and image after production metadata caches refresh.
- Begin requesting legitimate customer reviews after completed sessions.
- Continue expanding the portfolio with approved delivered photographs.
- Create a future authorized image-processing task for the oversized About portrait and other public oversized images.

## Do not do before verification

- Do not add fake reviews.
- Do not add unverified social-media URLs.
- Do not publish unsupported awards, credentials, or experience claims.
- Do not change production bindings or data resources casually.
- Do not process or replace photographs without explicit approval and source backups.

## Rollback guidance

1. Identify and record the last known-good production commit.
2. Create a focused rollback branch from current `main`.
3. Revert the release commit through a pull request without rewriting shared Git history.
4. Allow GitHub CI and the Cloudflare branch preview checks to complete.
5. Inspect the rollback preview and primary customer workflows.
6. Merge the rollback only after verification.
7. Allow the normal Git-connected deployment process to publish the verified rollback.

Do not manually change D1, R2, secrets, bindings, gallery data, or inquiry resources during a website-code rollback.

## Post-launch monitoring

For the first 48 hours:

- Confirm the homepage and every primary public page return successfully.
- Confirm inquiry delivery and Reply-To behavior.
- Confirm test-gallery access and downloads.
- Inspect the browser console on representative mobile and desktop workflows.
- Inspect Cloudflare errors and Worker logs where available.
- Confirm `sitemap.xml` and `robots.txt` remain reachable.
- Check Facebook and other configured social-sharing previews.
- Watch for customer reports of mobile navigation, forms, gallery access, or download problems.
- Record defects as new focused GitHub issues instead of making untracked production edits.
