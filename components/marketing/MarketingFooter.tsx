import Link from "next/link";
import { ThorWordmark } from "@/components/ThorWordmark";

export function MarketingFooter() {
    const year = new Date().getFullYear();
    return (
        <footer className="bg-black text-white">
            <div className="mx-auto max-w-7xl px-6 lg:px-10 pt-24 pb-12">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-10">
                    <div className="col-span-2 space-y-5 md:max-w-xs">
                        <ThorWordmark size={28} surface="dark" />
                        <p className="text-[14px] text-white/55 leading-[1.65]">
                            An operating system for the trades. Jobs, quotes, invoices and reports — one quiet, considered workspace.
                        </p>
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.28em] font-semibold">
                            Built in Australia
                        </p>
                    </div>

                    <FooterColumn
                        title="Product"
                        links={[
                            { href: "/features", label: "Features" },
                            { href: "/pricing", label: "Pricing" },
                        ]}
                    />
                    <FooterColumn
                        title="Company"
                        links={[
                            { href: "/about", label: "About" },
                            { href: "/contact", label: "Contact" },
                        ]}
                    />
                    <FooterColumn
                        title="Account"
                        links={[
                            { href: "/login", label: "Sign in" },
                            { href: "/signup", label: "Begin trial" },
                        ]}
                    />
                </div>

                {/* Colophon — typographic credit, the kind of detail you only see on really considered sites */}
                <div className="mt-20 pt-8 border-t border-white/10">
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-baseline sm:justify-between text-[12px] text-white/40">
                        <p>© {year} THOR. All rights reserved.</p>
                        <p className="font-statement italic">
                            Set in Bricolage Grotesque &amp; Inter. Designed in Melbourne.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
    return (
        <div className="space-y-5">
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">{title}</h4>
            <ul className="space-y-3.5">
                {links.map((l) => (
                    <li key={l.href}>
                        <Link href={l.href} className="text-[14px] text-white/75 hover:text-white transition-colors">
                            {l.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
