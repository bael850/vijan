"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth, signIn } from "@/auth";
import {
  addComment,
  getCommentActivity,
  hideComment,
  rememberDisplayName,
} from "@/lib/comments/queries";
import { isAuthorEmail } from "@/lib/comments/author";
import { getPostBySlug } from "@/lib/content/data";
import { allowLoginAttempt } from "@/lib/comments/rate-limit";
import { commentErrors } from "@/content/comments";

const COMMENT_LIMIT_PER_10_MIN = 5;

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

// Huruf Kiril/Yunani yang tampak seperti huruf Latin — pola klasik meniru nama.
const CONFUSABLES: Record<string, string> = {
  а: "a",
  е: "e",
  о: "o",
  р: "p",
  с: "c",
  х: "x",
  у: "y",
  і: "i",
  ј: "j",
  ӏ: "l",
  к: "k",
  м: "m",
  н: "h",
  т: "t",
  ι: "i",
  ο: "o",
  α: "a",
  ν: "v",
  κ: "k",
  μ: "m",
};

function normalizeName(nama: string) {
  return nama
    .normalize("NFKC") // huruf lebar penuh, ligatur, dll. -> bentuk biasa
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // buang aksen: "Vijån" -> "Vijan"
    .toLowerCase()
    .replace(/./gu, (ch) => CONFUSABLES[ch] ?? ch)
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Dibandingkan tanpa spasi juga, supaya "v i j a n" ikut tertolak.
const squash = (s: string) => s.replace(/\s/g, "");
const RESERVED_SQUASHED = new Set([...RESERVED_NAMES].map(squash));

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
    return { status: "error", message: commentErrors.emailInvalid };
  }

  try {
    const allowed = await allowLoginAttempt(await getClientIp(), email);
    if (!allowed) {
      return {
        status: "error",
        message: commentErrors.tooManyAttempts,
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
      message: commentErrors.sendLinkFailed,
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
      message: commentErrors.loginRequired,
    };
  }

  // Komentar hanya boleh untuk tulisan yang benar-benar ada.
  const post = await getPostBySlug(slug);
  if (!post) {
    return { status: "error", message: commentErrors.postNotFound };
  }

  // Nama tampilan: dari form, atau nama akun. TIDAK PERNAH jatuh ke email.
  const nama = (String(formData.get("nama") || "") || session.user.name || "")
    .replace(/\s+/g, " ")
    .trim();
  const isi = String(formData.get("isi") || "").trim();

  if (nama.length < 2) {
    return {
      status: "error",
      message: commentErrors.nameRequired,
    };
  }
  if (nama.length > 40) {
    return {
      status: "error",
      message: commentErrors.nameTooLong,
    };
  }

  // Pemilik situs (AUTHOR_EMAIL) boleh memakai nama penulis.
  const isAuthor = isAuthorEmail(session.user.email);
  if (!isAuthor && RESERVED_SQUASHED.has(squash(normalizeName(nama)))) {
    return {
      status: "error",
      message: commentErrors.nameReserved,
    };
  }

  if (!isi) {
    return { status: "error", message: commentErrors.commentEmpty };
  }
  if (isi.length > 2000) {
    return {
      status: "error",
      message: commentErrors.commentTooLong,
    };
  }

  // Batas kirim per akun (penulis dikecualikan) + tolak komentar kembar.
  if (!isAuthor) {
    try {
      const { recent, duplicate } = await getCommentActivity(
        session.user.id,
        post.slug,
        isi,
      );
      if (recent >= COMMENT_LIMIT_PER_10_MIN) {
        return { status: "error", message: commentErrors.tooManyComments };
      }
      if (duplicate) {
        return { status: "error", message: commentErrors.duplicateComment };
      }
    } catch (err) {
      console.error(err);
      return { status: "error", message: commentErrors.saveFailed };
    }
  }

  try {
    await addComment({ slug: post.slug, userId: session.user.id, nama, isi });
    // Best-effort: gagal simpan nama tidak boleh menggagalkan komentar.
    await rememberDisplayName(session.user.id, nama).catch(() => {});
  } catch (err) {
    console.error(err);
    return {
      status: "error",
      message: commentErrors.saveFailed,
    };
  }

  revalidatePath(`/vers/${post.slug}`);
  return { status: "success" };
}

// Hanya penulis. Dicek ulang di server — tombol di UI bukan pengaman.
export async function hideCommentAction(
  slug: string,
  commentId: number,
): Promise<void> {
  const session = await auth();
  if (!isAuthorEmail(session?.user?.email)) return;
  if (!Number.isInteger(commentId)) return;

  await hideComment(commentId, slug);
  revalidatePath(`/vers/${slug}`);
}
