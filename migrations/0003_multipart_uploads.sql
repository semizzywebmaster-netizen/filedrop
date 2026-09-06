-- FileDrop resumable R2 multipart upload state
ALTER TABLE transfer_files ADD COLUMN multipart_upload_id TEXT;

CREATE TABLE IF NOT EXISTS transfer_file_parts (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES transfer_files(id) ON DELETE CASCADE,
  part_number INTEGER NOT NULL,
  etag TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(file_id, part_number)
);

CREATE INDEX IF NOT EXISTS idx_file_parts_file ON transfer_file_parts(file_id);
CREATE INDEX IF NOT EXISTS idx_file_parts_file_part ON transfer_file_parts(file_id, part_number);
