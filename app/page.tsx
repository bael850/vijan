import { getAllPosts, getAllFoto } from "@/lib/data";
import Hero from "@/components/Hero";
import Intro from "@/components/Intro";
import PostList from "@/components/PostList";
import KagePreview from "@/components/KagePreview";
import DownloadCTA from "@/components/DownloadCTA";

export default async function Home() {
  const [posts, fotos] = await Promise.all([getAllPosts(), getAllFoto()]);

  return (
    <main className="min-h-screen text-white">
      <Hero />
      <Intro />
      <PostList posts={posts} />
      <KagePreview fotos={fotos} />
      <DownloadCTA />
    </main>
  );
}
