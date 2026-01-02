import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ArtisScan - Scanner vos factures",
  description: "Scannez et gérez vos factures d'artisan facilement",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ArtisScan",
  },
  icons: {
    icon: [
      { url: "/icon-rounded.svg", type: "image/svg+xml" }
    ],
    apple: [
      {
        url: "/icon-rounded.svg",
        sizes: "180x180",
        type: "image/svg+xml",
      },
    ],
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
        {/* Couleur de la barre de statut iOS - Clair Moderne */}
        <meta name="theme-color" content="#f8fafc" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        
        {/* Meta tags pour iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="ArtisScan" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="ArtisScan" />
        
        {/* Viewport optimisé pour mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        
        {/* Manifest PWA */}
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
