-- Jalankan sekali di database yang SUDAH berjalan.
ALTER TABLE comments ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS comments_user_created_idx ON comments (user_id, created_at);