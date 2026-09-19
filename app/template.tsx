"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  // Curtain-nya udah dipegang penuh oleh PageTransitionProvider (satu
  // lapis, satu sumber kebenaran). Di sini cukup animasi konten masuk —
  // dan karena saat mount ini layar masih ketutup penuh oleh curtain,
  // konten sempat "settle" duluan sebelum curtain kebuka, jadi pas
  // kebuka yang keliatan udah utuh, bukan lagi dalam proses muncul.
  //
  // Sengaja HANYA fade (tanpa y/translate): transform di elemen ini bikin
  // semua elemen `fixed` di dalamnya (overlay boot & menu di EntryGate)
  // dipatok ke elemen ini, bukan ke layar. Akibatnya overlay setinggi
  // seluruh halaman, lampu boot nongol di tengah halaman (di luar layar),
  // lalu tiba-tiba loncat ke tengah layar begitu animasi selesai dan
  // transform-nya hilang.
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
