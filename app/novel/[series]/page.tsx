import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostsBySeries } from "@/lib/content/data";
import SeriesView, { seriesTitle } from "@/components/vers/SeriesView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ series: string }>;
}): Promise<Metadata> {
  const { series } = await params;
  return { title: seriesTitle(series) };
}

export default async function NovelSeries({
  params,
}: {
  params: Promise<{ series: string }>;
}) {
  const { series } = await params;
  const chapters = await getPostsBySeries(series);
  if (chapters.length === 0) return notFound();
  return (
    <div className="bg-black">
      <SeriesView series={series} chapters={chapters} />
    </div>
  );
}
