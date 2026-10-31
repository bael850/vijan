import PostView from "@/components/vers/PostView";
import ReaderOverlay from "@/components/reader/ReaderOverlay";

// Dibuka lewat klik dari dalam situs (mis. buku di meja ruang study): tampil
// sebagai lapisan di atas dunia. Kalau link dibuka langsung / di-refresh,
// yang tampil halaman penuh di app/vers/[slug]/page.tsx.
export default async function VersOverlay({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <ReaderOverlay>
      <PostView slug={slug} overlay />
    </ReaderOverlay>
  );
}
