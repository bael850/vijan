"use client";

import { motion } from "framer-motion";
import SocialLinks from "@/components/SocialLinks";

const CREDITS = [
  { role: "Design", detail: "UI, identitas visual, art direction" },
  { role: "Developer", detail: "Next.js, Three.js, sistem end-to-end" },
  { role: "Nulis", detail: "Cerpen, sajak, kukulutus, naskah" },
  { role: "Dibangun dengan", detail: "Next.js · Three.js · Framer Motion" },
];

export default function CreditScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="relative flex h-full flex-col px-6 py-16 md:px-16 md:py-20">
      <h2 className="font-display mb-8 shrink-0 text-3xl font-black uppercase tracking-wide">
        Credit
      </h2>

      <div className="mask-fade relative flex-1 overflow-hidden">
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: "-120%" }}
          // Dipercepat dari 18s ke 9s — teksnya kebaca jelas, tapi nggak
          // bikin nunggu lama.
          transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
          className="flex flex-col gap-10"
        >
          {CREDITS.map((c) => (
            <div key={c.role}>
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-neutral-500">
                {c.role}
              </p>
              <p className="font-display text-xl text-neutral-300 md:text-2xl">
                {c.detail}
              </p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* CTA dirombak — dari label kecil "Hubungi" jadi ajakan yang lebih
          hidup, sekalian tagline singkat sebelum baris ikon sosial. */}
      <div className="mt-8 shrink-0 border-t border-neutral-800 pt-8">
        <p className="font-display mb-1 text-2xl text-white md:text-3xl">
          Yuk, Terhubung.
        </p>
        <p className="mb-5 max-w-sm text-sm text-neutral-500">
          Kolaborasi, obrolan, atau sekadar sapa — kotak masuk selalu terbuka.
        </p>
        <SocialLinks variant="icons" />
      </div>

      <button
        onClick={onBack}
        className="mt-8 shrink-0 self-start text-xs uppercase tracking-[0.2em] text-neutral-400 transition-colors hover:text-white"
      >
        ← Kembali
      </button>
    </div>
  );
}
