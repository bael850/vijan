"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function ExitScreen({ onBack }: { onBack: () => void }) {
  // Konfirmasi dulu sebelum "keluar" beneran — dan karena ini web
  // (bukan aplikasi desktop), window.close() cuma manjur kalau tab-nya
  // dibuka lewat script; kalau nggak, fallback-nya kasih tau user
  // buat nutup manual, bukan diem aja kayak nggak kejadian apa-apa.
  const [closing, setClosing] = useState(false);

  function handleConfirm() {
    setClosing(true);
    window.close();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative flex h-full flex-col items-center justify-center px-6 text-center"
    >
      <AnimatePresence mode="wait">
        {!closing ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            <p className="font-display mb-3 max-w-md text-2xl leading-relaxed text-neutral-200 md:text-3xl">
              Yakin mau pergi?
            </p>
            <p className="mb-10 max-w-sm text-sm text-neutral-500">
              Bumi adalah tempat meninggal, bukan tempat tinggal.
            </p>
            <div className="flex items-center justify-center gap-8">
              <button
                onClick={handleConfirm}
                className="text-sm uppercase tracking-[0.25em] text-neutral-400 transition-colors hover:text-[#ffb454]"
              >
                Ya
              </button>
              <span className="h-4 w-px bg-neutral-800" />
              <button
                onClick={onBack}
                className="text-sm uppercase tracking-[0.25em] text-white transition-colors hover:text-[#ffb454]"
              >
                Tidak
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="farewell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <p className="font-display mb-3 text-2xl text-neutral-300 md:text-3xl">
              Sampai jumpa.
            </p>
            <p className="mb-10 max-w-sm text-sm text-neutral-500">
              Kalau tab ini nggak otomatis ketutup, aman buat ditutup manual.
            </p>
            <button
              onClick={() => setClosing(false)}
              className="text-xs uppercase tracking-[0.2em] text-neutral-500 transition-colors hover:text-white"
            >
              ← Batal, kembali
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
