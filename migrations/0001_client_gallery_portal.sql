PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS galleries (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'deleted'))
);

CREATE INDEX IF NOT EXISTS idx_galleries_slug ON galleries(slug);
CREATE INDEX IF NOT EXISTS idx_galleries_expiry ON galleries(expires_at, status);

CREATE TABLE IF NOT EXISTS gallery_photos (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_at INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gallery_photos_gallery ON gallery_photos(gallery_id, sort_order, uploaded_at);

CREATE TABLE IF NOT EXISTS studio_login_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  requested_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_studio_codes_email ON studio_login_codes(email, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_codes_ip ON studio_login_codes(ip_hash, requested_at DESC);

CREATE TABLE IF NOT EXISTS studio_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_studio_sessions_token ON studio_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_studio_sessions_expiry ON studio_sessions(expires_at);

CREATE TABLE IF NOT EXISTS gallery_pin_attempts (
  attempt_key TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL,
  failures INTEGER NOT NULL DEFAULT 0,
  first_attempt_at INTEGER NOT NULL,
  last_attempt_at INTEGER NOT NULL,
  locked_until INTEGER,
  FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gallery_pin_attempts_cleanup ON gallery_pin_attempts(last_attempt_at);
