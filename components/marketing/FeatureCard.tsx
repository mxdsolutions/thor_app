import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
    icon: LucideIcon;
    title: string;
    body: string;
}

export function FeatureCard({ icon: Icon, title, body }: FeatureCardProps) {
    return (
        <div className="rounded-2xl border border-border/60 bg-card p-7 transition-colors hover:border-foreground/15">
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-secondary mb-5">
                <Icon className="w-[18px] h-[18px] text-foreground/80" strokeWidth={1.75} />
            </div>
            <h3 className="font-statement text-[20px] font-semibold tracking-tight mb-2">{title}</h3>
            <p className="text-[14px] text-muted-foreground leading-[1.65]">{body}</p>
        </div>
    );
}
