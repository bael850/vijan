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

export const metadata: Metadata = {
  title: "Vijan — An Ordinary People",
  description: "Portofolio & blog pribadi: artikel, cerpen, novel, naskah.",
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
