import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Bricolage_Grotesque } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const plexMono = IBM_Plex_Mono({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-plex-mono", display: "swap" });
const bricolage = Bricolage_Grotesque({ weight: ["400", "600", "700", "800"], subsets: ["latin"], variable: "--font-bricolage", display: "swap" });

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
    default: "THOR — The operating system for tradies",
  },
  description:
    "Run jobs, scheduling, quotes, invoices, reports and timesheets from one place. Built in Australia for trades and construction businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable} ${bricolage.variable} ${paladinsCond.variable}`}>
      <body className="font-sans min-h-dvh flex flex-col">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
