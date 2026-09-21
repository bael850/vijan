import type { Metadata } from "next";
import { Bodoni_Moda, Public_Sans } from "next/font/google";
import "./globals.css";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import Navbar from "@/components/Navbar";
import { PageTransitionProvider } from "@/components/PageTransition";
import { GraphicsProvider } from "@/components/providers/GraphicsProvider";

const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Set NEXT_PUBLIC_SITE_URL di production (mis. https://vijan.id) supaya link
// preview (og:image, canonical) memakai domain yang benar.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Vijan — An Ordinary People",
    template: "%s — Vijan",
  },
  description: "Portofolio & blog pribadi: artikel, cerpen, novel, naskah.",
  openGraph: {
    siteName: "Vijan",
    locale: "id_ID",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${bodoniModa.variable} ${publicSans.variable}`}>
      <body className="font-sans antialiased bg-black text-white">
        <GraphicsProvider>
          <SmoothScrollProvider>
            <PageTransitionProvider>
              <Navbar />
              {children}
            </PageTransitionProvider>
          </SmoothScrollProvider>
        </GraphicsProvider>
      </body>
    </html>
  );
}
