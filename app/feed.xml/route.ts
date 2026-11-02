import { getAllPosts } from "@/lib/content/data";
import { site } from "@/content/site";
import { siteUrl } from "@/lib/site-url";

export const revalidate = 3600;

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export async function GET() {
  const posts = (await getAllPosts()).slice(0, 30);

  const items = posts
    .map((p) => {
      const url = `${siteUrl}/vers/${encodeURIComponent(p.slug)}`;
      const d = new Date(p.tanggal);
      return `    <item>
      <title>${esc(p.judul)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      ${Number.isNaN(d.getTime()) ? "" : `<pubDate>${d.toUTCString()}</pubDate>`}
      <category>${esc(p.tipe)}</category>
      <description>${esc(p.ringkasan)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(site.title)}</title>
    <link>${siteUrl}</link>
    <description>${esc(site.description)}</description>
    <language>id</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
