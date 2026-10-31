import { notFound } from "next/navigation";
import { getPostsBySeries } from "@/lib/content/data";
import SeriesView from "@/components/vers/SeriesView";
import ReaderOverlay from "@/components/reader/ReaderOverlay";

// Cerbung dibuka dari dalam dunia: daftar bab tampil di atas dunia.
export default async function NovelOverlay({
  params,
}: {
  params: Promise<{ series: string }>;
}) {
  const { series } = await params;
  const chapters = await getPostsBySeries(series);
  if (chapters.length === 0) return notFound();
  return (
    <ReaderOverlay>
      <SeriesView series={series} chapters={chapters} overlay />
    </ReaderOverlay>
  );
}
