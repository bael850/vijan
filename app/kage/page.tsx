import type { Metadata } from "next";
import { getAllFoto } from "@/lib/content/data";
import Darkroom from "@/components/kage/Darkroom";
import { kage } from "@/content/kage";

export const metadata: Metadata = {
  title: kage.meta.title,
  description: kage.meta.description,
};

export default async function KagePage() {
  const fotos = await getAllFoto();
  return <Darkroom fotos={fotos} />;
}
