# LXE Photography Agent Instructions

These rules apply to every coding agent working in this repository.

## Project identity

LXE Photography is a production photography website for Lexus Erickson in Muskegon, Michigan, serving West Michigan. The public experience should feel warm, bright, emotional, natural, modern, minimal, and premium. It must not feel like a generic template.

## Instruction priority

1. Follow the assigned GitHub issue and its acceptance criteria.
2. Follow this `AGENTS.md`.
3. Preserve established repository architecture and documented production behavior.
4. When instructions conflict or require production secrets, stop and report the conflict instead of guessing.

## Scope discipline

- Make the smallest complete change that satisfies the assigned issue.
- Do not add unrelated cleanup, redesigns, refactors, features, dependencies, or content.
- Do not change business facts, prices, package contents, contact information, payment handles, legal language, or service offerings unless the issue explicitly requires it.
- Do not invent testimonials, reviews, client names, permissions, credentials, dates, or business claims.
- Do not replace, regenerate, crop, recolor, delete, or reorganize photographs unless the issue explicitly authorizes those exact image changes.
- Do not broaden the business into weddings or other services not explicitly approved.

## Protected systems

Unless the assigned issue explicitly requires changes, do not modify:

- Studio authentication or sign-in behavior
- Client gallery authentication, codes, PINs, sessions, expiration, downloads, or deletion
- Cloudflare D1 or R2 bindings, IDs, migrations, schemas, or production resources
- Inquiry email bindings or production Cloudflare configuration
- Payment URLs or Cash App details
- Secrets, tokens, environment variables, or `.dev.vars`
- Private-route blocking, security headers, throttling, privacy controls, or abuse protections

Never commit real secrets. Never guess a production binding ID, database ID, bucket name, email configuration, or credential.

## Public website standards

- Preserve the established warm cream, soft beige, muted earth-tone, and dusty-blue direction.
- Avoid heavy black sections, flashy animation, busy layouts, pink themes, and stock photography.
- Keep content emotion-first and customer-facing.
- Avoid internal project language, placeholders, unsupported claims, and keyword stuffing.
- Maintain responsive behavior, semantic HTML, useful alt text, keyboard access, visible focus states, and readable contrast.
- Keep private Studio and client-gallery routes out of public indexing.

## Git and delivery workflow

- Work only on the branch assigned for the task.
- Do not commit directly to `main`.
- Do not merge the pull request.
- Keep the diff focused and explain any file changed outside the obvious task scope.
- Open a pull request into `main` when the task is complete.
- Link the assigned issue in the pull request body.

## Verification

Before opening or updating a pull request:

1. Run `npm run verify`.
2. Fix all failures caused by the change.
3. Review the full diff for unintended edits, leaked data, changed business facts, and unrelated formatting churn.
4. Report the commands run and their results in the pull request.
5. Call out anything that could not be tested locally.

A passing automated check does not replace visual review. For public-facing changes, inspect representative mobile and desktop layouts when the available environment supports it.

## Required completion report

The pull request must summarize:

- What changed
- Why it changed
- Files changed
- Verification performed
- Known limitations or untested production behavior
- Confirmation that protected systems and business facts were not changed
