import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import PWARegister from "@/components/PWARegister";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Alteract Gestion Locative",
    template: "%s | Alteract",
  },

  description:
    "Plateforme de gestion locative pour agences, propriétaires et locataires.",

  applicationName: "Alteract Gestion Locative",

  manifest: "/manifest.webmanifest",

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Alteract",
  },

  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#ef4444",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${manrope.variable}`}>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}