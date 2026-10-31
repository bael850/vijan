import { pool } from "@/lib/db";

// Batas kirim link login. Disimpan di Postgres (bukan memori) karena di
// serverless tiap request bisa jalan di instance berbeda.
const IP_LIMIT = 5; // per 15 menit
const EMAIL_LIMIT = 3; // per jam

/**
 * Cek + catat satu percobaan kirim link login.
 * ip boleh null (mis. saat dev lokal) — kalau null, hanya batas per-email.
 */
export async function allowLoginAttempt(
  ip: string | null,
  email: string,
): Promise<boolean> {
  // Bersihkan data lama sekalian (tabel kecil, murah).
  await pool.query(
    `DELETE FROM login_attempts WHERE created_at < now() - interval '1 day'`,
  );

  const { rows } = await pool.query(
    `SELECT
       count(*) FILTER (WHERE ip = $1 AND created_at > now() - interval '15 minutes') AS ip_count,
       count(*) FILTER (WHERE email = $2 AND created_at > now() - interval '1 hour') AS email_count
     FROM login_attempts`,
    [ip, email],
  );

  const ipCount = Number(rows[0].ip_count);
  const emailCount = Number(rows[0].email_count);

  if ((ip && ipCount >= IP_LIMIT) || emailCount >= EMAIL_LIMIT) return false;

  await pool.query(`INSERT INTO login_attempts (ip, email) VALUES ($1, $2)`, [
    ip,
    email,
  ]);
  return true;
}
