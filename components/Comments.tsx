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
      <p className="text-sm text-neutral-500 mb-8">
        Komentar {comments.length > 0 && `(${comments.length})`}
      </p>

      <div className="flex flex-col gap-8 mb-12">
        {comments.length === 0 && (
          <p className="text-neutral-600 text-sm">
            Belum ada komentar. Jadi yang pertama?
          </p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="border-b border-neutral-900 pb-6">
            <div className="flex items-baseline justify-between gap-4 mb-2">
              <span className="font-display text-lg">{c.nama}</span>
              <span className="text-xs text-neutral-600">
                {new Date(c.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap">
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
          <input
            type="text"
            name="nama"
            defaultValue={displayName ?? ""}
            placeholder="Nama kamu"
            className="bg-transparent border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-600"
          />
          <textarea
            name="isi"
            required
            rows={4}
            placeholder="Tulis komentar..."
            className="bg-transparent border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-600 resize-none"
          />
          <button
            type="submit"
            disabled={commentPending}
            className="self-start px-5 py-2.5 rounded-full border border-neutral-700 text-sm hover:border-white transition-colors disabled:opacity-50"
          >
            {commentPending ? "Mengirim..." : "Kirim komentar"}
          </button>
          {commentState.status === "error" && (
            <p className="text-sm text-red-400">{commentState.message}</p>
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
              placeholder="email@kamu.com"
              className="flex-1 bg-transparent border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-600"
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
            <p className="text-sm text-red-400">{loginState.message}</p>
          )}
          {loginState.status === "sent" && (
            <p className="text-sm text-neutral-500">
              Link masuk sudah dikirim, cek email kamu.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
