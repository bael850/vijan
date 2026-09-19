"use client";

import { createContext, useContext } from "react";

// true = boot & menu sudah lewat (pengunjung sudah menekan "Enter" di sesi
// ini). Komponen di halaman utama (mis. Hero) pakai ini buat baru mulai
// animasi masuknya SAAT overlay mulai kebuka — kalau nggak, animasinya jalan
// di balik overlay dan sudah selesai sebelum pengunjung sempat melihatnya.
// Default true supaya komponen yang dipakai di luar EntryGate tetap
// beranimasi seperti biasa.
export const EntryContext = createContext<boolean>(true);

export function useEntered() {
  return useContext(EntryContext);
}
