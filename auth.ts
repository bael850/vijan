import NextAuth from "next-auth";
import PostgresAdapter from "@auth/pg-adapter";
import { Resend } from "resend";
import { pool } from "@/lib/db";

const resend = new Resend(process.env.RESEND_API_KEY);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(pool),
  session: { strategy: "database" },
  pages: {
    verifyRequest: "/masuk/cek-email",
  },
  providers: [
    {
      id: "resend-email",
      name: "Email",
      type: "email",
      maxAge: 60 * 60 * 24, // link berlaku 24 jam
      async sendVerificationRequest({ identifier: email, url }) {
        const { error } = await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: email,
          subject: "Link masuk ke Vijan",
          html: `
            <div style="font-family: sans-serif; font-size: 15px; line-height: 1.6; color: #111;">
              <p>Klik tombol di bawah untuk masuk dan mulai berkomentar di Vijan.</p>
              <p>
                <a href="${url}" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">
                  Masuk sekarang
                </a>
              </p>
              <p style="color:#666;font-size:13px;">Link ini berlaku 24 jam. Kalau kamu tidak meminta ini, abaikan saja email ini.</p>
            </div>
          `,
        });

        if (error) {
          throw new Error(`Gagal mengirim email verifikasi: ${error.message}`);
        }
      },
    },
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
