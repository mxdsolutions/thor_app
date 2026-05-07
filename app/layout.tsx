import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Inter, Bricolage_Grotesque } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const plexSans = IBM_Plex_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-plex-sans" });
const plexMono = IBM_Plex_Mono({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-plex-mono", display: "swap" });
const bricolage = Bricolage_Grotesque({ weight: ["400", "600", "700", "800"], subsets: ["latin"], variable: "--font-bricolage", display: "swap" });

const bebasNeuePro = localFont({
    src: [
        { path: "../public/Bebas Neue Pro/Bebas Neue Pro Thin.ttf",         weight: "100", style: "normal" },
        { path: "../public/Bebas Neue Pro/Bebas Neue Pro Thin Italic.ttf",   weight: "100", style: "italic" },
        { path: "../public/Bebas Neue Pro/Bebas Neue Pro Light.ttf",         weight: "300", style: "normal" },
        { path: "../public/Bebas Neue Pro/Bebas Neue Pro Light Italic.ttf",  weight: "300", style: "italic" },
        { path: "../public/Bebas Neue Pro/Bebas Neue Pro Book.ttf",          weight: "350", style: "normal" },
        { path: "../public/Bebas Neue Pro/Bebas Neue Pro Book Italic.ttf",   weight: "350", style: "italic" },
        { path: "../public/Bebas Neue Pro/Bebas Neue Pro Regular.ttf",       weight: "400", style: "normal" },
        { path: "../public/Bebas Neue Pro/Bebas Neue Pro Italic.ttf",        weight: "400", style: "italic" },
        { path: "../public/Bebas Neue Pro/Bebas Neue Pro Middle.ttf",        weight: "500", style: "normal" },
        { path: "../public/Bebas Neue Pro/Bebas Neue Pro Middle Italic.ttf", weight: "500", style: "italic" },
        { path: "../public/Bebas Neue Pro/Bebas Neue Pro Bold.ttf",          weight: "700", style: "normal" },
        { path: "../public/Bebas Neue Pro/Bebas Neue Pro Bold Italic.ttf",   weight: "700", style: "italic" },
    ],
    variable: "--font-antonio",
});

const paladinsCond = localFont({
    src: [{ path: "./fonts/paladinscond.ttf", weight: "400", style: "normal" }],
    variable: "--font-paladins-cond",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    template: "%s • THOR",
    default: "THOR",
  },
  description: "THOR administration platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${plexSans.variable} ${plexMono.variable} ${bricolage.variable} ${bebasNeuePro.variable} ${paladinsCond.variable}`}>
      <body className="font-sans min-h-dvh flex flex-col">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
