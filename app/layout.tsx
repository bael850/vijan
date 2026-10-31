import type { Metadata, Viewport } from "next";
import { IM_Fell_English } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SoundToggle from "@/components/SoundToggle";
import { GraphicsProvider } from "@/components/providers/GraphicsProvider";

// Satu font untuk semuanya: IM Fell English, serif bergaya cetakan Inggris
// lama. Cuma punya satu bobot (reguler) dan italic, jadi hierarki dibuat
// lewat ukuran dan jarak, bukan tebal.
const fell = IM_Fell_English({
  subsets: ["latin"],
  variable: "--font-fell",
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

// Teks deskripsi ini sementara — tulis ulang dengan suaramu sendiri.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Vijan — An Ordinary People", template: "%s — Vijan" },
  description: "Tulisan, foto, dan hal-hal kecil yang sempat kuingat.",
  openGraph: { siteName: "Vijan", locale: "id_ID", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#17121a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={fell.variable}>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <GraphicsProvider>
          <Navbar />
          {children}
          <Footer />
          <SoundToggle />
        </GraphicsProvider>
      </body>
    </html>
  );
}
