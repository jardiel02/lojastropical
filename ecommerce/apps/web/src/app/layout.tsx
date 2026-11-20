import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

// Mesmas fontes do site original: Poppins nos títulos e Inter nos textos
const poppins = Poppins({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-poppins", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.name, template: `%s | ${SITE.name}` },
  description: SITE.description,
  openGraph: { type: "website", locale: "pt_BR", siteName: SITE.name, images: ["/img/logo.png"] },
  robots: process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true" ? { index: true, follow: true } : { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#d8121b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
