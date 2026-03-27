"use client";

import { useState, useEffect } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DetailFields } from "./DetailFields";
import { NotesPanel } from "./NotesPanel";
import { ActivityTimeline } from "./ActivityTimeline";

type Company = {
    id: string;
    name: string;
    industry: string | null;
    phone: string | null;
    email: string | null;
    website?: string | null;
    city: string | null;
    state: string | null;
    address?: string | null;
    postcode?: string | null;
    status: string;
    notes?: string | null;
    created_at: string;
};

interface CompanySideSheetProps {
    company: Company | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CompanySideSheet({ company, open, onOpenChange }: CompanySideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");

    useEffect(() => {
        if (company?.id) setActiveTab("details");
    }, [company?.id]);

    if (!company) return null;

    const tabs = [
        { id: "details", label: "Details" },
        { id: "notes", label: "Notes" },
        { id: "activity", label: "Activity" },
    ];

    const location = [company.city, company.state].filter(Boolean).join(", ");

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 border-l border-border bg-background">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-border">
                    <SheetHeader className="flex flex-row items-start gap-4 space-y-0 text-left">
                        <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center font-bold text-xl text-foreground ring-1 ring-border/50 shrink-0 mt-0.5">
                            {company.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                            <div className="flex items-center gap-2.5">
                                <SheetTitle className="text-xl font-bold truncate">{company.name}</SheetTitle>
                                <Badge variant="outline" className="shrink-0 text-[10px] font-bold uppercase tracking-wider">
                                    <span className={cn(
                                        "w-1.5 h-1.5 rounded-full mr-1.5",
                                        company.status === "active" ? "bg-emerald-500" : "bg-amber-500"
                                    )} />
                                    {company.status}
                                </Badge>
                            </div>
                            <SheetDescription className="text-sm text-muted-foreground mt-1 truncate">
                                {company.industry || location || "Company"}
                            </SheetDescription>
                        </div>
                    </SheetHeader>
                </div>

                {/* Tabs + Content */}
                <div className="flex flex-col flex-1 min-h-0 bg-secondary/20">
                    <div className="px-6 border-b border-border/50 bg-background">
                        <div className="flex gap-6 -mb-px pt-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "pb-3 text-sm font-medium transition-colors relative focus:outline-none",
                                        activeTab === tab.id
                                            ? "text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-foreground rounded-t-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === "details" && (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-border bg-card p-5">
                                    <DetailFields fields={[
                                        { label: "Industry", value: company.industry },
                                        { label: "Email", value: company.email },
                                        { label: "Phone", value: company.phone },
                                        { label: "Website", value: company.website },
                                        { label: "Location", value: location || null },
                                        { label: "Address", value: company.address },
                                        { label: "Postcode", value: company.postcode },
                                        { label: "Status", value: company.status ? company.status.charAt(0).toUpperCase() + company.status.slice(1) : null },
                                        { label: "Created", value: new Date(company.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                                    ]} />
                                </div>
                            </div>
                        )}

                        {activeTab === "notes" && (
                            <NotesPanel entityType="company" entityId={company.id} />
                        )}

                        {activeTab === "activity" && (
                            <ActivityTimeline entityType="company" entityId={company.id} />
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
