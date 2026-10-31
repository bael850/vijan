import type { Metadata } from "next";
import { getAllFoto } from "@/lib/data";
import Darkroom from "@/components/world/Darkroom";

export const metadata: Metadata = {
  title: "Kamar gelap",
  description: "Foto-foto yang menyimpan cerita.",
};

export default async function KagePage() {
  const fotos = await getAllFoto();
  return <Darkroom fotos={fotos} />;
}
