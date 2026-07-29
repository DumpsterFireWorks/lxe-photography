# LXE Photography Client Gallery Portal

This portal keeps client delivery inside `lxephotography.com`.

## What Lexus can do

Lexus signs in at:

```text
https://lxephotography.com/studio/
```

The studio sends a six-digit login code to:

```text
lynnlexus421@gmail.com
```

After signing in, Lexus can:

1. Enter the client name and gallery title.
2. Choose or generate a four-digit client PIN.
3. Create the gallery.
4. Upload finished JPEG, PNG, or WebP photographs.
5. Copy the private client link and prepared delivery message.
6. Delete a photo or the entire gallery at any time.

Every gallery expires exactly 30 days after creation. The public link stops working at the expiration timestamp. An hourly Cloudflare Cron Trigger removes the expired database record and every file stored under that gallery.

## What the client receives

A private link such as:

```text
https://lxephotography.com/gallery/smith-family-lake-michigan
```

The client enters the four-digit PIN, views the photographs, downloads individual images, or downloads the full collection as one ZIP file.

Client galleries are marked `noindex`, excluded in `robots.txt`, protected by a signed access cookie, and never exposed through a public R2 bucket.

## Cloudflare resources required before merge

The code is complete, but it intentionally does not add fake resource identifiers to `wrangler.jsonc`. Create the real Cloudflare resources first.

### 1. Create the D1 database

From the repository folder:

```bash
npm run gallery:db:create
```

This creates a database named:

```text
lxe-client-galleries
```

Cloudflare will return a database UUID. Add this block to `wrangler.jsonc` at the top level:

```jsonc
"d1_databases": [
  {
    "binding": "GALLERY_DB",
    "database_name": "lxe-client-galleries",
    "database_id": "PASTE-THE-REAL-DATABASE-UUID-HERE",
    "migrations_dir": "migrations"
  }
],
```

### 2. Create the private R2 bucket

```bash
npm run gallery:bucket:create
```

Add this block to `wrangler.jsonc`:

```jsonc
"r2_buckets": [
  {
    "binding": "GALLERY_BUCKET",
    "bucket_name": "lxe-client-galleries"
  }
],
```

Do not enable public bucket access. Every photograph must be delivered through the authenticated Worker route.

### 3. Create the authentication secret

Run:

```bash
npx wrangler secret put GALLERY_AUTH_SECRET
```

Paste a long random value when prompted. This secret signs client access and strengthens PIN and login-code hashing. Never commit the value to GitHub.

### 4. Apply the database migration

```bash
npm run gallery:migrate
```

The migration creates:

- galleries
- gallery photos
- studio login codes
- studio sessions
- PIN attempt limits

### 5. Add an R2 lifecycle backup

The Worker blocks access at exactly 30 days and runs cleanup hourly. As a second layer, add an R2 object lifecycle rule to the `lxe-client-galleries` bucket that deletes objects after 31 days.

The extra day prevents the bucket rule from deleting a file slightly before the gallery expiration when uploads happen shortly after gallery creation.

### 6. Deploy

```bash
npm run check
npm run deploy
```

## Security behavior

- Lexus does not use a permanent website password.
- Sign-in codes expire after 10 minutes and can be used once.
- Studio sessions expire after 12 hours.
- Client gallery access expires after 6 hours and can be reopened with the PIN.
- Six incorrect client PIN attempts lock that visitor out for 15 minutes.
- Four-digit PINs are never stored as plain text.
- Studio session tokens are stored only as hashes.
- Gallery objects remain private in R2.
- Every public gallery route checks the 30-day expiration before returning metadata or files.
- Each photograph is limited to 25 MB.
- Each gallery is limited to 250 photographs.

## Current delivery message

The studio prepares this message automatically after gallery creation:

```text
Your photos from LXE Photography are ready!

Gallery: [private link]
PIN: [four-digit PIN]

Please download and save your photographs before [expiration date]. The private gallery expires after 30 days.
```

## Important operational rule

The portal is for finished client delivery. Lexus should upload only the final edited JPEGs that the customer is supposed to receive. RAW files, unfinished proofs, duplicates, and photographs awaiting approval should stay out of the delivery gallery.
