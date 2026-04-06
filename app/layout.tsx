import type { Metadata, Viewport } from "next";
import { Open_Sans, Bebas_Neue } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-open-sans" });
const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas-neue" });

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
    <html lang="en">
      <body className={`${openSans.variable} ${bebasNeue.variable} font-sans min-h-screen flex flex-col`}>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
