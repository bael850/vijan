import { getAllFoto } from "@/lib/content/data";
import Darkroom from "@/components/kage/Darkroom";
import ReaderOverlay from "@/components/reader/ReaderOverlay";

// Foto dibuka dari dalam dunia: kamar gelap tampil di atas dunia.
export default async function KageOverlay() {
  const fotos = await getAllFoto();
  return (
    <ReaderOverlay variant="dark" wide>
      <Darkroom fotos={fotos} overlay />
    </ReaderOverlay>
  );
}
