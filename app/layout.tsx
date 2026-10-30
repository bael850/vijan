import type { Metadata } from "next";
import { Archivo, Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GraphicsProvider } from "@/components/providers/GraphicsProvider";

// Archivo (sumbu lebar) = judul super tebal yang bisa melebar saat hover.
// Instrument Serif italic = kata aksen yang elegan sebagai kontras.
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["wdth"],
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Vijan — Galeri tulisan & foto", template: "%s — Vijan" },
  description:
    "Galeri tulisan dan fotografi pribadi: cerpen, sajak, cerbung, dan potret sehari-hari.",
  openGraph: { siteName: "Vijan", locale: "id_ID", type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${archivo.variable} ${instrument.variable} ${inter.variable}`}
    >
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <GraphicsProvider>
          <Navbar />
          {children}
          <Footer />
        </GraphicsProvider>
      </body>
    </html>
  );
}
