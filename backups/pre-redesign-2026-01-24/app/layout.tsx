import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../../app/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ArtisScan - Gestion intelligente pour artisans",
  description: "Scannez et gérez vos factures d'artisan facilement avec l'IA",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ArtisScan",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-rounded.svg", type: "image/svg+xml" }
    ],
    apple: [
      {
        url: "/icon-rounded.svg",
        sizes: "180x180",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <meta name="theme-color" content="#f8fafc" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="ArtisScan" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="ArtisScan" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}


