import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Antonio } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const plexSans = IBM_Plex_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-plex-sans" });
const antonio = Antonio({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-antonio" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    template: "%s | MXD",
    default: "MXD Admin",
  },
  description: "MXD administration platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plexSans.variable} ${antonio.variable}`}>
      <body className="font-sans min-h-screen flex flex-col">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
