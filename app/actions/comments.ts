"use server";

import { auth, signIn } from "@/auth";
import { addComment } from "@/lib/comments";
import { revalidatePath } from "next/cache";

export type RequestLoginState = {
  status: "idle" | "sent" | "error";
  message?: string;
};

export async function requestLoginLink(
  _prevState: RequestLoginState,
  formData: FormData,
): Promise<RequestLoginState> {
  const email = String(formData.get("email") || "").trim();
  const callbackUrl = String(formData.get("callbackUrl") || "/");

  if (!email || !email.includes("@")) {
    return { status: "error", message: "Masukkan alamat email yang valid." };
  }

  try {
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

  const nama = String(
    formData.get("nama") || session.user.name || session.user.email || "Anonim",
  ).trim();
  const isi = String(formData.get("isi") || "").trim();

  if (!isi) {
    return { status: "error", message: "Komentar tidak boleh kosong." };
  }
  if (isi.length > 2000) {
    return {
      status: "error",
      message: "Komentar terlalu panjang (maks 2000 karakter).",
    };
  }

  await addComment({ slug, userId: session.user.id, nama, isi });
  revalidatePath(`/vers/${slug}`);

  return { status: "success" };
}
