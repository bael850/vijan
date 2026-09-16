import { getAllPosts } from "@/lib/data";
import VersListClient from "@/components/VersListClient";
import Reveal from "@/components/Reveal";

export default async function VersPage() {
  const posts = await getAllPosts();

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-16 md:py-24">
        <Reveal>
          <h1 className="font-display text-5xl md:text-7xl leading-[1.05] mb-16">
            How Worlds Are Woven
          </h1>
        </Reveal>

        <VersListClient posts={posts} />
      </div>
    </main>
  );
}
