import { pool } from "@/lib/db";

export interface CommentRow {
  id: number;
  postSlug: string;
  nama: string;
  isi: string;
  createdAt: string;
}

export async function getCommentsBySlug(slug: string): Promise<CommentRow[]> {
  const { rows } = await pool.query(
    `SELECT id, post_slug AS "postSlug", nama, isi, created_at AS "createdAt"
     FROM comments
     WHERE post_slug = $1
     ORDER BY created_at ASC`,
    [slug],
  );
  return rows;
}

export async function addComment(params: {
  slug: string;
  userId: string | number;
  nama: string;
  isi: string;
}): Promise<CommentRow> {
  const { slug, userId, nama, isi } = params;
  const { rows } = await pool.query(
    `INSERT INTO comments (post_slug, user_id, nama, isi)
     VALUES ($1, $2, $3, $4)
     RETURNING id, post_slug AS "postSlug", nama, isi, created_at AS "createdAt"`,
    [slug, userId, nama, isi],
  );
  return rows[0];
}

// Simpan nama tampilan ke akun kalau akun itu belum punya nama, supaya
// komentar berikutnya sudah terisi otomatis. Tidak menimpa nama yang ada.
export async function rememberDisplayName(
  userId: string | number,
  nama: string,
): Promise<void> {
  await pool.query(
    `UPDATE users SET name = $2 WHERE id = $1 AND (name IS NULL OR name = '')`,
    [userId, nama],
  );
}
