import { Pool } from "pg";

// Satu pool koneksi dipakai bareng: adapter Auth.js dan query komentar kita
// sendiri. POSTGRES_URL bisa dari provider mana pun (Vercel Postgres, Neon,
// Supabase) — semuanya kompatibel karena ini Postgres biasa.
export const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});
