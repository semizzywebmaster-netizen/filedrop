-- Admin enhancements
ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN banned_at INTEGER;
ALTER TABLE users ADD COLUMN storage_used INTEGER DEFAULT 0;

ALTER TABLE system_settings ADD COLUMN description TEXT;
ALTER TABLE system_settings ADD COLUMN type TEXT DEFAULT 'string';

-- New admin tables
CREATE TABLE IF NOT EXISTS admin_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details TEXT,
  ip TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at);

CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  config TEXT,
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO feature_flags (key, enabled, config, updated_at) VALUES ('guest_uploads', 1, '{"expiry_days":3}', strftime('%s','now'));
INSERT OR IGNORE INTO feature_flags (key, enabled, config, updated_at) VALUES ('password_protection', 1, '{}', strftime('%s','now'));
INSERT OR IGNORE INTO feature_flags (key, enabled, config, updated_at) VALUES ('email_sharing', 1, '{}', strftime('%s','now'));
INSERT OR IGNORE INTO feature_flags (key, enabled, config, updated_at) VALUES ('api_access', 1, '{}', strftime('%s','now'));
INSERT OR IGNORE INTO feature_flags (key, enabled, config, updated_at) VALUES ('turnstile', 1, '{"mode":"upload_only"}', strftime('%s','now'));
INSERT OR IGNORE INTO feature_flags (key, enabled, config, updated_at) VALUES ('registration', 1, '{}', strftime('%s','now'));

-- Seed admin user flag example and more system settings
INSERT OR IGNORE INTO system_settings (key, value, updated_at) VALUES ('site_name', 'FileDrop', strftime('%s','now'));
INSERT OR IGNORE INTO system_settings (key, value, updated_at) VALUES ('allow_guest_uploads', 'true', strftime('%s','now'));
INSERT OR IGNORE INTO system_settings (key, value, updated_at) VALUES ('maintenance_mode', 'false', strftime('%s','now'));
INSERT OR IGNORE INTO system_settings (key, value, updated_at) VALUES ('rate_limit_uploads_per_hour', '20', strftime('%s','now'));
INSERT OR IGNORE INTO system_settings (key, value, updated_at) VALUES ('rate_limit_downloads_per_hour', '100', strftime('%s','now'));
INSERT OR IGNORE INTO system_settings (key, value, updated_at) VALUES ('max_storage_per_user_mb', '10240', strftime('%s','now'));
INSERT OR IGNORE INTO system_settings (key, value, updated_at) VALUES ('abuse_threshold', '5', strftime('%s','now'));
