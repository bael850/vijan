import { CONTACTS } from "@/content/contact";
import { desk, journey } from "@/content/world";
import type { ContentItem } from "../../types";

export type Spot = {
  tip: string;
  href: string;
  kind: "page" | "file" | "link" | "mail";
};

const CV = {
  writer: "/files/cv-writer-muhammad-iqbal-malik.pdf",
  marketing: "/files/cv-digitalmarketing-muhammad-iqbal-malik.pdf",
};

export function resolveSpot(
  id: string,
  writings: ContentItem[],
  photos: ContentItem[],
): Spot | null {
  if (id === "cv-writer")
    return { tip: desk.tips.cvWriter, href: CV.writer, kind: "file" };
  if (id === "cv-marketing")
    return { tip: desk.tips.cvMarketing, href: CV.marketing, kind: "file" };
  if (id === "library")
    return { tip: journey.libraryLink, href: "/vers", kind: "page" };
  if (id === "album")
    return { tip: desk.tips.album(photos.length), href: "/kage", kind: "page" };
  if (id.startsWith("book:")) {
    const w = writings[Number(id.slice(5))];
    return w ? { tip: w.title, href: w.href, kind: "page" } : null;
  }
  if (id.startsWith("contact:")) {
    const c = CONTACTS.find((x) => x.id === id.slice(8));
    if (!c) return null;
    return {
      tip: `${c.label} · ${c.handle}`,
      href: c.href,
      kind: c.href.startsWith("mailto:") ? "mail" : "link",
    };
  }
  return null;
}
