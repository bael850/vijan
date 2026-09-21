"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  requestLoginLink,
  postComment,
  type RequestLoginState,
  type PostCommentState,
} from "@/app/actions/comments";
import type { CommentRow } from "@/lib/comments";

const initialLoginState: RequestLoginState = { status: "idle" };
const initialCommentState: PostCommentState = { status: "idle" };

const inputClass =
  "bg-transparent border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-500 focus-visible:ring-1 focus-visible:ring-neutral-400";

export default function Comments({
  slug,
  comments,
  isLoggedIn,
  displayName,
}: {
  slug: string;
  comments: CommentRow[];
  isLoggedIn: boolean;
  displayName?: string | null;
}) {
  const router = useRouter();
  const postCommentWithSlug = postComment.bind(null, slug);
  const [loginState, loginAction, loginPending] = useActionState(
    requestLoginLink,
    initialLoginState,
  );
  const [commentState, commentAction, commentPending] = useActionState(
    postCommentWithSlug,
    initialCommentState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (commentState.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [commentState, router]);

  return (
    <div className="max-w-2xl mt-24 pt-10 border-t border-neutral-800">
      <h2 className="text-sm font-normal text-neutral-500 mb-8">
        Komentar {comments.length > 0 && `(${comments.length})`}
      </h2>

      <div className="flex flex-col gap-8 mb-12">
        {comments.length === 0 && (
          <p className="text-neutral-500 text-sm">
            Belum ada komentar. Jadi yang pertama?
          </p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="border-b border-neutral-900 pb-6">
            <div className="flex items-baseline justify-between gap-4 mb-2">
              <span className="font-display text-lg break-words min-w-0">
                {c.nama}
              </span>
              {/* timeZone dikunci: server (UTC) & browser (WIB) tidak boleh
                  beda hari, kalau tidak hydration mismatch. */}
              <span className="text-xs text-neutral-500 shrink-0">
                {new Date(c.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "Asia/Jakarta",
                })}
              </span>
            </div>
            <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap break-words">
              {c.isi}
            </p>
          </div>
        ))}
      </div>

      {isLoggedIn ? (
        <form
          ref={formRef}
          action={commentAction}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <input
              type="text"
              name="nama"
              required
              minLength={2}
              maxLength={40}
              autoComplete="nickname"
              aria-label="Nama tampilan"
              defaultValue={displayName ?? ""}
              placeholder="Nama kamu"
              className={inputClass}
            />
            <p className="text-xs text-neutral-500">
              Nama ini yang tampil di komentar. Email kamu tidak ditampilkan.
            </p>
          </div>
          <textarea
            name="isi"
            required
            rows={4}
            maxLength={2000}
            aria-label="Komentar"
            placeholder="Tulis komentar..."
            className={`${inputClass} resize-none`}
          />
          <button
            type="submit"
            disabled={commentPending}
            className="self-start px-5 py-2.5 rounded-full border border-neutral-700 text-sm hover:border-white transition-colors disabled:opacity-50"
          >
            {commentPending ? "Mengirim..." : "Kirim komentar"}
          </button>
          {commentState.status === "error" && (
            <p role="alert" className="text-sm text-red-400">
              {commentState.message}
            </p>
          )}
        </form>
      ) : (
        <form action={loginAction} className="flex flex-col gap-3 max-w-sm">
          <p className="text-sm text-neutral-500">
            Masuk pakai email dulu buat bisa berkomentar.
          </p>
          <input type="hidden" name="callbackUrl" value={`/vers/${slug}`} />
          <div className="flex gap-2">
            <input
              type="email"
              name="email"
              required
              maxLength={254}
              autoComplete="email"
              aria-label="Alamat email"
              placeholder="email@kamu.com"
              className={`flex-1 min-w-0 ${inputClass}`}
            />
            <button
              type="submit"
              disabled={loginPending}
              className="px-5 py-2.5 rounded-full border border-neutral-700 text-sm hover:border-white transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {loginPending ? "Mengirim..." : "Kirim link"}
            </button>
          </div>
          {loginState.status === "error" && (
            <p role="alert" className="text-sm text-red-400">
              {loginState.message}
            </p>
          )}
          {loginState.status === "sent" && (
            <p role="status" className="text-sm text-neutral-400">
              Link masuk sudah dikirim, cek email kamu. Belum ketemu? Coba cek
              folder spam.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
