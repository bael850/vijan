import { pool } from "@/lib/db";

// Batas kirim link login. Disimpan di Postgres (bukan memori) karena di
// serverless tiap request bisa jalan di instance berbeda.
const IP_LIMIT = 5; // per 15 menit
const EMAIL_LIMIT = 3; // per jam

/**
 * Cek + catat satu percobaan kirim link login dalam SATU statement, jadi
 * tidak ada jeda antara "cek" dan "catat" yang bisa diselip request lain.
 * ip boleh null (mis. saat dev lokal) — kalau null, hanya batas per-email.
 */
export async function allowLoginAttempt(
  ip: string | null,
  email: string,
): Promise<boolean> {
  // Bersihkan data lama sesekali saja (bukan di tiap request).
  if (Math.random() < 0.05) {
    await pool.query(
      `DELETE FROM login_attempts WHERE created_at < now() - interval '1 day'`,
    );
  }

  const { rows } = await pool.query(
    `WITH counts AS (
       SELECT
         count(*) FILTER (WHERE ip = $1::text AND created_at > now() - interval '15 minutes') AS ip_count,
         count(*) FILTER (WHERE email = $2::text AND created_at > now() - interval '1 hour') AS email_count
       FROM login_attempts
     ),
     ins AS (
       INSERT INTO login_attempts (ip, email)
       SELECT $1::text, $2::text FROM counts
       WHERE ($1::text IS NULL OR ip_count < $3) AND email_count < $4
       RETURNING 1
     )
     SELECT EXISTS (SELECT 1 FROM ins) AS allowed`,
    [ip, email, IP_LIMIT, EMAIL_LIMIT],
  );
  return rows[0].allowed === true;
}
