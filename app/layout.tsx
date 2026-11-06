import type { Metadata, Viewport } from "next";
import { Nunito, Outfit } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SoundToggle from "@/components/sound/SoundToggle";
import { GraphicsProvider } from "@/components/providers/GraphicsProvider";
import { site } from "@/content/site";
import { siteUrl } from "@/lib/site-url";

// Dua font sans serif. Outfit untuk judul dan penekanan (bulat, geometris, ramah);
// Nunito untuk isi dan UI (ujung huruf lembut, enak dibaca panjang). Keduanya variabel,
// jadi semua bobot tersedia. Outfit tidak punya italic: judul tegak saja.
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});
const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  style: ["normal", "italic"],
  display: "swap",
});

// Teks deskripsi ini sementara — tulis ulang dengan suaramu sendiri.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: site.title, template: `%s — ${site.name}` },
  description: site.description,
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
  openGraph: { siteName: site.name, locale: "id_ID", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0e1530",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${outfit.variable} ${nunito.variable}`}>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <GraphicsProvider>
          <Navbar />
          {children}
          {modal}
          <Footer />
          <SoundToggle />
        </GraphicsProvider>
      </body>
    </html>
  );
}
