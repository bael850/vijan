// Ditulis untuk direplace ke: components/ShareStory.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { FaInstagram, FaWhatsapp } from "react-icons/fa6";
import { FiDownload, FiX } from "react-icons/fi";
import type { Post } from "@/lib/types";

const CANVAS_W = 1080;
const CANVAS_H = 1920;
const PAD = 96;

type ShareStoryProps = {
  post: Post;
  tanggalFormatted: string;
  /** URL yang ditampilkan/dibagikan. Default: URL halaman saat ini. */
  url?: string;
  className?: string;
};

// Bersihin sintaks markdown kasar (link, heading, bold, dst) biar isi
// tulisan bisa ditampilkan sebagai teks polos di kartu story.
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[.*?\]\(.*?\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~]/g, " ")
    .replace(/\r?\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function excerptFrom(post: Post, max = 220): string {
  const source = post.ringkasan?.trim() || stripMarkdown(post.isi);
  if (source.length <= max) return source;
  const cut = source.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max)}…`;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// next/font nge-generate nama font unik lewat CSS var (--font-display /
// --font-sans). Kita ambil nilainya langsung dari computed style biar
// canvas ikut pakai font yang sama dengan tampilan situs, bukan default browser.
function getFontFamily(cssVar: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim();
  return value || fallback;
}

async function drawStory(
  canvas: HTMLCanvasElement,
  post: Post,
  tanggalFormatted: string,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  if (typeof document !== "undefined" && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Kalau gagal, browser tetap jatuh ke font fallback — nggak fatal.
    }
  }

  const displayFont = getFontFamily("--font-display", "Georgia, serif");
  const sansFont = getFontFamily("--font-sans", "system-ui, sans-serif");

  // Background — gradasi navy gelap senada tema situs (lihat app/globals.css).
  const bg = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
  bg.addColorStop(0, "#142236");
  bg.addColorStop(0.45, "#0d1b2a");
  bg.addColorStop(1, "#05070d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const glow = ctx.createRadialGradient(
    CANVAS_W * 0.15,
    CANVAS_H * 0.1,
    0,
    CANVAS_W * 0.15,
    CANVAS_H * 0.1,
    CANVAS_W * 0.75,
  );
  glow.addColorStop(0, "rgba(91, 141, 239, 0.16)");
  glow.addColorStop(1, "rgba(91, 141, 239, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Genre ghost — teks besar transparan, senada .genre-ghost di artikel.
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = "#f2f3f5";
  ctx.font = `italic 800 210px ${displayFont}`;
  ctx.translate(PAD - 10, 330);
  ctx.rotate((-2 * Math.PI) / 180);
  ctx.fillText(post.tipe, 0, 0);
  ctx.restore();

  // Eyebrow: genre + tanggal
  ctx.fillStyle = "#b9cfff";
  ctx.font = `600 30px ${sansFont}`;
  ctx.fillText(`${post.tipe.toUpperCase()} · ${tanggalFormatted}`, PAD, 460);

  // Tanda kutip dekoratif
  ctx.fillStyle = "rgba(91, 141, 239, 0.45)";
  ctx.font = `700 160px ${displayFont}`;
  ctx.fillText("\u201C", PAD - 10, 620);

  // Judul
  ctx.fillStyle = "#f2f3f5";
  ctx.font = `500 84px ${displayFont}`;
  const titleLines = wrapText(ctx, post.judul, CANVAS_W - PAD * 2).slice(0, 4);
  let y = 700;
  for (const line of titleLines) {
    ctx.fillText(line, PAD, y);
    y += 96;
  }

  // Cuplikan isi
  y += 40;
  ctx.fillStyle = "#c7cad1";
  ctx.font = `400 40px ${sansFont}`;
  const excerptLines = wrapText(
    ctx,
    excerptFrom(post),
    CANVAS_W - PAD * 2,
  ).slice(0, 7);
  for (const line of excerptLines) {
    ctx.fillText(line, PAD, y);
    y += 58;
  }

  // Footer
  const footerY = CANVAS_H - 150;
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, footerY - 50);
  ctx.lineTo(CANVAS_W - PAD, footerY - 50);
  ctx.stroke();

  ctx.fillStyle = "#f2f3f5";
  ctx.font = `700 40px ${sansFont}`;
  ctx.fillText("VIJAN", PAD, footerY + 10);

  ctx.fillStyle = "#8a8f98";
  ctx.font = `400 30px ${sansFont}`;
  ctx.fillText(
    "An Ordinary People · baca selengkapnya di link bio",
    PAD,
    footerY + 55,
  );
}

// Konten modal dipisah jadi komponen sendiri dan cuma dirender saat modal
// terbuka (lihat pemakaian `{open && <StoryModal ... />}` di bawah). Dengan
// begitu, tiap kali dibuka komponen ini mount dari nol dan state-nya
// (ready/status) otomatis mulai bersih lagi — nggak perlu reset manual pakai
// setState sinkron di dalam effect (yang bikin cascading render).
function StoryModal({
  post,
  tanggalFormatted,
  shareUrl,
  onClose,
}: {
  post: Post;
  tanggalFormatted: string;
  shareUrl: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    drawStory(canvas, post, tanggalFormatted).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [post, tanggalFormatted]);

  const getBlob = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      canvas.toBlob((blob) => resolve(blob), "image/png", 0.95);
    });

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${post.slug}-story.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleShare = async (target: "instagram" | "whatsapp") => {
    setStatus(null);
    const blob = await getBlob();
    if (!blob) return;
    const file = new File([blob], `${post.slug}-story.png`, {
      type: "image/png",
    });

    const canShareFiles =
      typeof navigator !== "undefined" &&
      !!navigator.canShare &&
      navigator.canShare({ files: [file] });

    if (canShareFiles) {
      try {
        await navigator.share({
          files: [file],
          title: post.judul,
          text: `${post.judul} — baca selengkapnya: ${shareUrl}`,
        });
        return;
      } catch (err) {
        // AbortError = user batal dari share sheet, bukan error → diamkan.
        if (err instanceof Error && err.name === "AbortError") return;
        // Selain itu (mis. gagal karena alasan lain), lanjut ke fallback di bawah.
      }
    }

    // Browser/perangkat belum dukung bagikan file langsung → unduh gambar,
    // user tinggal upload manual ke Story/Status.
    downloadCanvas();
    setStatus(
      target === "instagram"
        ? "Gambar sudah diunduh. Buka Instagram → buat Story baru → unggah gambarnya."
        : "Gambar sudah diunduh. Buka WhatsApp → Status → unggah gambarnya.",
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-full w-full max-w-sm flex-col items-center gap-5 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute -top-2 right-0 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-neutral-700 bg-black/60 text-neutral-400 hover:text-white"
        >
          <FiX size={16} />
        </button>

        <div className="relative w-full overflow-hidden rounded-2xl border border-neutral-800 bg-black shadow-2xl">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="block aspect-[9/16] w-full h-auto"
          />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-500">
              Menyiapkan gambar…
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-3">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleShare("instagram")}
              disabled={!ready}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-3 text-sm text-white transition-colors hover:bg-white/20 disabled:opacity-40"
            >
              <FaInstagram size={16} /> Instagram
            </button>
            <button
              type="button"
              onClick={() => handleShare("whatsapp")}
              disabled={!ready}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-3 text-sm text-white transition-colors hover:bg-white/20 disabled:opacity-40"
            >
              <FaWhatsapp size={16} /> WhatsApp
            </button>
          </div>
          <button
            type="button"
            onClick={downloadCanvas}
            disabled={!ready}
            className="flex items-center justify-center gap-2 rounded-full border border-neutral-700 px-4 py-2.5 text-xs uppercase tracking-[0.15em] text-neutral-400 hover:text-white disabled:opacity-40"
          >
            <FiDownload size={14} /> Unduh gambar
          </button>
          {status && (
            <p className="text-center text-xs text-neutral-500">{status}</p>
          )}
          <p className="text-center text-[11px] text-neutral-600">
            Tombol Instagram/WhatsApp membuka jendela bagikan bawaan HP kamu —
            pilih aplikasinya di sana.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ShareStory({
  post,
  tanggalFormatted,
  url,
  className = "",
}: ShareStoryProps) {
  const [open, setOpen] = useState(false);
  const shareUrl =
    url ?? (typeof window !== "undefined" ? window.location.href : "");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-full border border-neutral-700 px-4 py-2 text-xs uppercase tracking-[0.15em] text-neutral-400 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent-soft)] hover:text-[var(--accent-soft)] ${className}`}
      >
        Bagikan sebagai Story
      </button>

      {open && (
        <StoryModal
          post={post}
          tanggalFormatted={tanggalFormatted}
          shareUrl={shareUrl}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
