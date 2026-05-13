import type { Metadata, Viewport } from "next";
import { Inter, Bricolage_Grotesque } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

const bricolage = Bricolage_Grotesque({
    weight: ["400", "600", "700", "800"],
    subsets: ["latin"],
    variable: "--font-bricolage",
    display: "swap",
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
    title: "THOR — The Tradie Operating System",
    description:
        "Less time in the business, more time on it. Join the waiting list for early access to THOR — the Tradie Operating System.",
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html
            lang="en"
            className={`${inter.variable} ${bricolage.variable} ${paladinsCond.variable}`}
        >
            <body className="font-sans min-h-dvh">
                {children}
                <Toaster position="top-center" richColors theme="dark" />
            </body>
        </html>
    );
}
