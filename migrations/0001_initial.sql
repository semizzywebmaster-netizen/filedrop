-- FileDrop Initial Schema
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  email_verified INTEGER DEFAULT 0,
  verification_token TEXT,
  verification_expires INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  ip TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);

CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL, -- secure public token, NOT sequential
  owner_id TEXT REFERENCES users(id),
  guest_token TEXT, -- for guest ownership
  title TEXT,
  message TEXT,
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, expired, deleted
  expiry_days INTEGER NOT NULL DEFAULT 7,
  expires_at INTEGER NOT NULL,
  max_downloads INTEGER,
  download_count INTEGER DEFAULT 0,
  total_size INTEGER DEFAULT 0,
  files_count INTEGER DEFAULT 0,
  email_to TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transfers_token ON transfers(token);
CREATE INDEX IF NOT EXISTS idx_transfers_owner ON transfers(owner_id);
CREATE INDEX IF NOT EXISTS idx_transfers_expires ON transfers(expires_at);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);

CREATE TABLE IF NOT EXISTS transfer_files (
  id TEXT PRIMARY KEY,
  transfer_id TEXT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime_type TEXT,
  r2_key TEXT NOT NULL,
  chunk_total INTEGER,
  chunk_uploaded INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, uploading, completed, deleted
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_files_transfer ON transfer_files(transfer_id);
CREATE INDEX IF NOT EXISTS idx_files_r2key ON transfer_files(r2_key);

CREATE TABLE IF NOT EXISTS download_events (
  id TEXT PRIMARY KEY,
  transfer_id TEXT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  file_id TEXT REFERENCES transfer_files(id) ON DELETE SET NULL,
  ip TEXT,
  user_agent TEXT,
  country TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_downloads_transfer ON download_events(transfer_id);
CREATE INDEX IF NOT EXISTS idx_downloads_created ON download_events(created_at);

CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  ip TEXT,
  user_id TEXT,
  details TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS abuse_reports (
  id TEXT PRIMARY KEY,
  transfer_id TEXT REFERENCES transfers(id),
  reason TEXT NOT NULL,
  reporter_email TEXT,
  details TEXT,
  status TEXT DEFAULT 'open',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ratelimit_key ON rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_ratelimit_created ON rate_limits(created_at);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  prefix TEXT NOT NULL,
  last_used_at INTEGER,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_apikeys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_apikeys_prefix ON api_keys(prefix);

INSERT OR IGNORE INTO system_settings (key, value, updated_at) VALUES ('max_file_size_mb', '2048', strftime('%s','now'));
INSERT OR IGNORE INTO system_settings (key, value, updated_at) VALUES ('max_files_per_transfer', '50', strftime('%s','now'));
INSERT OR IGNORE INTO system_settings (key, value, updated_at) VALUES ('default_expiry_days', '7', strftime('%s','now'));
