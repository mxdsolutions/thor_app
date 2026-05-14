import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { createClient } from "@/lib/supabase/server";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isAuthed = !!user;

    return (
        <div className="min-h-dvh flex flex-col bg-background">
            <MarketingNav isAuthed={isAuthed} />
            <main className="flex-1">{children}</main>
            <MarketingFooter />
        </div>
    );
}
