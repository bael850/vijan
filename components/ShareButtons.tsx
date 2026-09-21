// Ditulis untuk direplace ke: components/ShareButtons.tsx
"use client";

import { useState, useSyncExternalStore } from "react";
import {
  FaWhatsapp,
  FaFacebookF,
  FaInstagram,
  FaTiktok,
} from "react-icons/fa6";
import { FiCopy, FiCheck, FiShare2 } from "react-icons/fi";

// Web Share API cuma ada di browser (bukan di server), dan nilainya nggak
// pernah berubah selama sesi berjalan — cocok dipakai lewat useSyncExternalStore
// (subscribe kosong) daripada useEffect+setState, supaya render pertama di
// client tetap sama dengan HTML hasil SSR (nggak ada warning hydration mismatch).
const noopSubscribe = () => () => {};
const getCanShareSnapshot = () =>
  typeof navigator !== "undefined" && !!navigator.share;
const getCanShareServerSnapshot = () => false;

type ShareButtonsProps = {
  /** Judul tulisan — dipakai sebagai teks share. */
  title: string;
  /** Ringkasan singkat, opsional — ditambahkan setelah judul. */
  text?: string;
  /** URL yang dibagikan. Default: URL halaman saat ini. */
  url?: string;
  className?: string;
};

const ICON_BTN =
  "group relative flex h-11 w-11 items-center justify-center rounded-full border border-neutral-700 text-neutral-400 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent-soft)] hover:text-[var(--accent-soft)]";

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Fallback untuk browser lama / konteks non-secure yang nggak punya Clipboard API.
    try {
      const el = document.createElement("textarea");
      el.value = value;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      return true;
    } catch {
      return false;
    }
  }
}

// Instagram & TikTok nggak punya web-intent buat "share link" langsung
// (beda dari WhatsApp/Facebook yang punya URL resmi). Jadi di sini kita coba
// Web Share API dulu (di HP bakal nongolin app IG/TikTok kalau kepasang),
// dan kalau browser-nya nggak dukung, link-nya disalin lalu situs IG/TikTok
// dibuka biar user tinggal tempel manual di caption/story/bio.
async function shareOrCopyThenOpen({
  title,
  text,
  url,
  fallbackAppUrl,
  onCopied,
}: {
  title: string;
  text: string;
  url: string;
  fallbackAppUrl: string;
  onCopied: () => void;
}) {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch {
      // User menutup/batalin share sheet — jangan lanjut ke fallback.
      return;
    }
  }
  const copied = await copyToClipboard(`${text} ${url}`);
  if (copied) onCopied();
  window.open(fallbackAppUrl, "_blank", "noopener,noreferrer");
}

export default function ShareButtons({
  title,
  text = "",
  url,
  className = "",
}: ShareButtonsProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const canNativeShare = useSyncExternalStore(
    noopSubscribe,
    getCanShareSnapshot,
    getCanShareServerSnapshot,
  );

  const shareUrl =
    url ?? (typeof window !== "undefined" ? window.location.href : "");
  const shareText = text ? `${title} — ${text}` : title;

  const flashCopied = (key: string) => {
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current));
    }, 2000);
  };

  const items: {
    key: string;
    label: string;
    icon: typeof FaWhatsapp;
    onClick: () => void;
  }[] = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: FaWhatsapp,
      onClick: () => {
        window.open(
          `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
          "_blank",
          "noopener,noreferrer",
        );
      },
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: FaFacebookF,
      onClick: () => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
          "_blank",
          "noopener,noreferrer",
        );
      },
    },
    {
      key: "instagram",
      label: "Instagram",
      icon: FaInstagram,
      onClick: () =>
        shareOrCopyThenOpen({
          title,
          text: shareText,
          url: shareUrl,
          fallbackAppUrl: "https://instagram.com",
          onCopied: () => flashCopied("instagram"),
        }),
    },
    {
      key: "tiktok",
      label: "TikTok",
      icon: FaTiktok,
      onClick: () =>
        shareOrCopyThenOpen({
          title,
          text: shareText,
          url: shareUrl,
          fallbackAppUrl: "https://www.tiktok.com",
          onCopied: () => flashCopied("tiktok"),
        }),
    },
  ];

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={item.onClick}
          aria-label={`Bagikan ke ${item.label}`}
          title={
            copiedKey === item.key
              ? "Link disalin!"
              : `Bagikan ke ${item.label}`
          }
          className={ICON_BTN}
        >
          {copiedKey === item.key ? (
            <FiCheck size={16} />
          ) : (
            <item.icon size={16} />
          )}
        </button>
      ))}

      <button
        type="button"
        onClick={async () => {
          const copied = await copyToClipboard(shareUrl);
          if (copied) flashCopied("copy");
        }}
        aria-label="Salin link"
        title={copiedKey === "copy" ? "Link disalin!" : "Salin link"}
        className={ICON_BTN}
      >
        {copiedKey === "copy" ? <FiCheck size={16} /> : <FiCopy size={16} />}
      </button>

      {canNativeShare && (
        <button
          type="button"
          onClick={() => {
            navigator
              .share({ title, text: shareText, url: shareUrl })
              .catch(() => {});
          }}
          aria-label="Bagikan lainnya"
          title="Bagikan lainnya"
          className={ICON_BTN}
        >
          <FiShare2 size={16} />
        </button>
      )}
    </div>
  );
}
