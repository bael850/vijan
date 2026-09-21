"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth, signIn } from "@/auth";
import { addComment, rememberDisplayName } from "@/lib/comments";
import { getPostBySlug } from "@/lib/data";
import { allowLoginAttempt } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Nama yang tidak boleh dipakai pembaca supaya tidak bisa menyamar sebagai
// penulis. Cocok persis setelah dinormalisasi (huruf kecil, tanpa simbol),
// jadi pembaca bernama "Iqbal" saja tetap boleh.
const RESERVED_NAMES = new Set([
  "vijan",
  "admin",
  "penulis",
  "author",
  "muhammad iqbal malik",
  "muhammad iqbal",
  "iqbal malik",
]);

function normalizeName(nama: string) {
  return nama
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || null;
}

export type RequestLoginState = {
  status: "idle" | "sent" | "error";
  message?: string;
};

export async function requestLoginLink(
  _prevState: RequestLoginState,
  formData: FormData,
): Promise<RequestLoginState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  // Hanya izinkan redirect ke path internal.
  const rawCallback = String(formData.get("callbackUrl") || "/");
  const callbackUrl =
    rawCallback.startsWith("/") && !rawCallback.startsWith("//")
      ? rawCallback
      : "/";

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return { status: "error", message: "Masukkan alamat email yang valid." };
  }

  try {
    const allowed = await allowLoginAttempt(await getClientIp(), email);
    if (!allowed) {
      return {
        status: "error",
        message:
          "Terlalu banyak percobaan. Coba lagi beberapa menit lagi, atau cek email kamu — link sebelumnya masih berlaku.",
      };
    }

    await signIn("resend-email", {
      email,
      redirect: false,
      redirectTo: callbackUrl,
    });
    return { status: "sent" };
  } catch (err) {
    console.error(err);
    return {
      status: "error",
      message: "Gagal mengirim link masuk. Coba lagi sebentar lagi.",
    };
  }
}

export type PostCommentState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function postComment(
  slug: string,
  _prevState: PostCommentState,
  formData: FormData,
): Promise<PostCommentState> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      status: "error",
      message: "Kamu harus masuk dulu untuk berkomentar.",
    };
  }

  // Komentar hanya boleh untuk tulisan yang benar-benar ada.
  const post = await getPostBySlug(slug);
  if (!post) {
    return { status: "error", message: "Tulisan tidak ditemukan." };
  }

  // Nama tampilan: dari form, atau nama akun. TIDAK PERNAH jatuh ke email.
  const nama = (String(formData.get("nama") || "") || session.user.name || "")
    .replace(/\s+/g, " ")
    .trim();
  const isi = String(formData.get("isi") || "").trim();

  if (nama.length < 2) {
    return {
      status: "error",
      message: "Isi nama tampilan dulu (minimal 2 karakter).",
    };
  }
  if (nama.length > 40) {
    return {
      status: "error",
      message: "Nama terlalu panjang (maks 40 karakter).",
    };
  }

  // Pemilik situs (AUTHOR_EMAIL) boleh memakai nama penulis.
  const isAuthor =
    !!process.env.AUTHOR_EMAIL &&
    session.user.email?.toLowerCase() ===
      process.env.AUTHOR_EMAIL.toLowerCase();
  if (!isAuthor && RESERVED_NAMES.has(normalizeName(nama))) {
    return {
      status: "error",
      message: "Nama itu dicadangkan. Pakai nama lain ya.",
    };
  }

  if (!isi) {
    return { status: "error", message: "Komentar tidak boleh kosong." };
  }
  if (isi.length > 2000) {
    return {
      status: "error",
      message: "Komentar terlalu panjang (maks 2000 karakter).",
    };
  }

  try {
    await addComment({ slug: post.slug, userId: session.user.id, nama, isi });
    // Best-effort: gagal simpan nama tidak boleh menggagalkan komentar.
    await rememberDisplayName(session.user.id, nama).catch(() => {});
  } catch (err) {
    console.error(err);
    return {
      status: "error",
      message: "Gagal menyimpan komentar. Coba lagi sebentar lagi.",
    };
  }

  revalidatePath(`/vers/${post.slug}`);
  return { status: "success" };
}
