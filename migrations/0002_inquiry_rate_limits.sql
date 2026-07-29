CREATE TABLE IF NOT EXISTS inquiry_rate_limits (
  ip_hash TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inquiry_rate_limits_cleanup
  ON inquiry_rate_limits(last_attempt_at);
