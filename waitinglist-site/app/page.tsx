import { WaitlistForm } from "./WaitlistForm";

const TICKER_ITEMS = [
    "Jobs & projects",
    "Scheduling",
    "Quotes & invoices",
    "Contacts & companies",
    "Reports & photos",
    "Mobile timesheets",
];

export default function WaitingListPage() {
    return (
        <main className="relative min-h-dvh overflow-hidden bg-black text-white flex flex-col">
            <div
                aria-hidden
                className="absolute -top-48 -right-48 w-[760px] h-[760px] rounded-full opacity-60 blur-[120px]"
                style={{
                    background:
                        "radial-gradient(closest-side, hsla(16,87%,55%,0.18), hsla(16,87%,55%,0) 72%)",
                }}
            />

            <div className="relative flex-1 flex flex-col items-center justify-center px-6 lg:px-10 py-20 text-center">
                <p className="mb-10 sm:mb-14 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/45">
                    Get Early Access
                </p>

                <h1 className="flex items-center justify-center">
                    <ShimmerThorWordmark />
                </h1>

                <p className="mt-10 sm:mt-14 font-statement text-xl sm:text-2xl md:text-3xl font-semibold tracking-[-0.018em] leading-[1.25] text-white/75 max-w-2xl text-balance">
                    The Tradie Operating System.
                    <br />
                    Less time{" "}
                    <span className="italic font-medium text-white/55">in</span>{" "}
                    the business, more time{" "}
                    <span className="italic font-medium text-white/95">on</span>{" "}
                    it.
                </p>

                <div className="mt-10 sm:mt-12 w-full max-w-md">
                    <WaitlistForm />
                </div>

                <p className="mt-5 text-[12px] italic font-statement text-white/35">
                    No card required. Cancel anytime.
                </p>
            </div>

            <Ticker items={TICKER_ITEMS} />
        </main>
    );
}

function ShimmerThorWordmark() {
    return (
        <span
            className="font-paladins tracking-[0.08em] inline-flex items-start leading-none text-[88px] sm:text-[140px] md:text-[180px] lg:text-[220px]"
            aria-label="THOR"
        >
            <span
                className="thor-shimmer leading-none"
                style={{ paddingRight: "0.12em" }}
            >
                THOR
            </span>
            <span
                className="font-sans font-semibold align-super text-white/55"
                style={{
                    fontSize: "0.34em",
                    marginLeft: "0.16em",
                    marginTop: "0.14em",
                }}
                aria-hidden
            >
                ™
            </span>
        </span>
    );
}

function Ticker({ items }: { items: string[] }) {
    const doubled = [...items, ...items];
    return (
        <div className="relative border-t border-white/10 py-5 overflow-hidden">
            <div className="thor-ticker flex items-center">
                {doubled.map((item, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-10 sm:gap-14 pr-10 sm:pr-14 shrink-0"
                    >
                        <span className="text-[11px] sm:text-[12px] uppercase tracking-[0.3em] text-white/55 font-semibold whitespace-nowrap">
                            {item}
                        </span>
                        <span
                            aria-hidden
                            className="w-1 h-1 rounded-full bg-white/25 shrink-0"
                        />
                    </div>
                ))}
            </div>
            <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-24 sm:w-32 bg-gradient-to-r from-black to-transparent"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 w-24 sm:w-32 bg-gradient-to-l from-black to-transparent"
            />
        </div>
    );
}
