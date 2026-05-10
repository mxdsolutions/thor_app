"use client";

import {
    Briefcase,
    Building2,
    FileText,
    Receipt,
    User as UserIcon,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import {
    invoiceStatusDotClass,
    quoteStatusDotClass,
    paidStatusTextClass,
} from "@/lib/design-system";
import type { EntityPreviewType } from "@/lib/swr";

type Maybe<T> = T | null | undefined;

interface PreviewHeaderProps {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    subtitle?: Maybe<string>;
}

function PreviewHeader({ icon, iconBg, title, subtitle }: PreviewHeaderProps) {
    return (
        <div className="flex items-start gap-3 px-4 pt-4">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-foreground truncate leading-tight">{title}</p>
                {subtitle && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
                )}
            </div>
        </div>
    );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-xs text-muted-foreground shrink-0">{label}</span>
            <span className="text-foreground text-right truncate min-w-0">{children}</span>
        </div>
    );
}

function StatusDot({ className }: { className: string }) {
    return <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle", className)} />;
}

function dash(value: Maybe<string | number>): React.ReactNode {
    if (value === null || value === undefined || value === "") {
        return <span className="text-muted-foreground/60">—</span>;
    }
    return value;
}

function formatDate(value: Maybe<string>): React.ReactNode {
    if (!value) return dash(null);
    const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
    if (Number.isNaN(d.getTime())) return dash(null);
    return d.toLocaleDateString("en-AU", { dateStyle: "medium" });
}

// ---- Per-type rendering ----

interface ContactItem {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    job_title: string | null;
    status: string | null;
    company: { id: string; name: string } | null;
}

interface CompanyItem {
    id: string;
    name: string;
    industry: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    state: string | null;
    status: string | null;
    is_supplier: boolean | null;
}

interface JobItem {
    id: string;
    job_title: string;
    status: string;
    amount: number;
    paid_status: string | null;
    reference_id: string | null;
    company: { id: string; name: string } | null;
    contact: { id: string; first_name: string; last_name: string } | null;
}

interface InvoiceItem {
    id: string;
    invoice_number: string | null;
    reference: string | null;
    status: string;
    total: number;
    amount_due: number;
    due_date: string | null;
    company: { id: string; name: string } | null;
}

interface QuoteItem {
    id: string;
    title: string;
    status: string;
    total_amount: number;
    valid_until: string | null;
    company: { id: string; name: string } | null;
    contact: { id: string; first_name: string; last_name: string } | null;
    job: { id: string; job_title: string } | null;
}

interface UserItem {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    avatar_url: string | null;
    position: string | null;
}

const PAID_STATUS_LABEL: Record<string, string> = {
    not_paid: "Not paid",
    partly_paid: "Partly paid",
    paid_in_full: "Paid in full",
};

function ContactPreview({ item }: { item: ContactItem }) {
    const fullName = `${item.first_name} ${item.last_name}`.trim() || "Contact";
    const initials = `${item.first_name?.[0] ?? ""}${item.last_name?.[0] ?? ""}`.toUpperCase() || "?";
    return (
        <>
            <PreviewHeader
                icon={<span className="text-xs font-bold text-violet-600">{initials}</span>}
                iconBg="bg-violet-500/10"
                title={fullName}
                subtitle={item.job_title || item.email || "Contact"}
            />
            <div className="px-4 py-3 space-y-2">
                {item.email && <FieldRow label="Email">{item.email}</FieldRow>}
                {item.phone && <FieldRow label="Phone">{item.phone}</FieldRow>}
                {item.company?.name && <FieldRow label="Company">{item.company.name}</FieldRow>}
                {item.status && (
                    <FieldRow label="Status">
                        <span className="capitalize">
                            <StatusDot className={item.status === "active" ? "bg-emerald-500" : "bg-amber-500"} />
                            {item.status}
                        </span>
                    </FieldRow>
                )}
            </div>
        </>
    );
}

function CompanyPreview({ item }: { item: CompanyItem }) {
    const location = [item.city, item.state].filter(Boolean).join(", ");
    return (
        <>
            <PreviewHeader
                icon={<Building2 className="w-5 h-5 text-blue-600" />}
                iconBg="bg-blue-500/10"
                title={item.name}
                subtitle={item.industry || location || "Company"}
            />
            <div className="px-4 py-3 space-y-2">
                {item.email && <FieldRow label="Email">{item.email}</FieldRow>}
                {item.phone && <FieldRow label="Phone">{item.phone}</FieldRow>}
                {location && <FieldRow label="Location">{location}</FieldRow>}
                {item.is_supplier && <FieldRow label="Type">Supplier</FieldRow>}
                {item.status && (
                    <FieldRow label="Status">
                        <span className="capitalize">
                            <StatusDot className={item.status === "active" ? "bg-emerald-500" : "bg-amber-500"} />
                            {item.status}
                        </span>
                    </FieldRow>
                )}
            </div>
        </>
    );
}

function JobPreview({ item }: { item: JobItem }) {
    const customer = item.contact
        ? `${item.contact.first_name} ${item.contact.last_name}`.trim()
        : item.company?.name ?? null;
    const paidLabel = item.paid_status ? PAID_STATUS_LABEL[item.paid_status] ?? item.paid_status : null;
    return (
        <>
            <PreviewHeader
                icon={<Briefcase className="w-5 h-5 text-blue-600" />}
                iconBg="bg-blue-500/10"
                title={item.job_title}
                subtitle={item.reference_id || customer}
            />
            <div className="px-4 py-3 space-y-2">
                {customer && <FieldRow label="Customer">{customer}</FieldRow>}
                <FieldRow label="Amount">{formatCurrency(item.amount)}</FieldRow>
                {paidLabel && (
                    <FieldRow label="Payment">
                        <span className={cn("capitalize", paidStatusTextClass[item.paid_status ?? ""] ?? "")}>
                            {paidLabel}
                        </span>
                    </FieldRow>
                )}
                <FieldRow label="Status">
                    <span className="capitalize">{item.status?.replace(/_/g, " ")}</span>
                </FieldRow>
            </div>
        </>
    );
}

function InvoicePreview({ item }: { item: InvoiceItem }) {
    const dot = invoiceStatusDotClass[item.status] || "bg-gray-400";
    return (
        <>
            <PreviewHeader
                icon={<Receipt className="w-5 h-5 text-emerald-600" />}
                iconBg="bg-emerald-500/10"
                title={item.invoice_number || item.reference || "Draft invoice"}
                subtitle={item.company?.name}
            />
            <div className="px-4 py-3 space-y-2">
                <FieldRow label="Total">{formatCurrency(item.total)}</FieldRow>
                <FieldRow label="Due">{formatCurrency(item.amount_due)}</FieldRow>
                {item.due_date && <FieldRow label="Due date">{formatDate(item.due_date)}</FieldRow>}
                <FieldRow label="Status">
                    <span className="capitalize">
                        <StatusDot className={dot} />
                        {item.status}
                    </span>
                </FieldRow>
            </div>
        </>
    );
}

function QuotePreview({ item }: { item: QuoteItem }) {
    const dot = quoteStatusDotClass[item.status] || "bg-gray-400";
    const customer = item.contact
        ? `${item.contact.first_name} ${item.contact.last_name}`.trim()
        : item.company?.name ?? null;
    return (
        <>
            <PreviewHeader
                icon={<FileText className="w-5 h-5 text-muted-foreground" />}
                iconBg="bg-secondary"
                title={item.title}
                subtitle={customer}
            />
            <div className="px-4 py-3 space-y-2">
                {item.job?.job_title && <FieldRow label="Job">{item.job.job_title}</FieldRow>}
                <FieldRow label="Total">{formatCurrency(item.total_amount)}</FieldRow>
                {item.valid_until && <FieldRow label="Valid until">{formatDate(item.valid_until)}</FieldRow>}
                <FieldRow label="Status">
                    <span className="capitalize">
                        <StatusDot className={dot} />
                        {item.status}
                    </span>
                </FieldRow>
            </div>
        </>
    );
}

function UserPreview({ item }: { item: UserItem }) {
    const name = item.full_name || item.email || "User";
    const initials = item.full_name
        ? item.full_name.split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase()
        : (item.email?.slice(0, 2).toUpperCase() ?? "?");
    return (
        <>
            <PreviewHeader
                icon={
                    item.avatar_url
                        ? // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                        : <span className="text-xs font-bold text-foreground">{initials}</span>
                }
                iconBg={item.avatar_url ? "" : "bg-secondary"}
                title={name}
                subtitle={item.position || item.email || "User"}
            />
            <div className="px-4 py-3 space-y-2">
                {item.email && <FieldRow label="Email">{item.email}</FieldRow>}
                {item.position && <FieldRow label="Position">{item.position}</FieldRow>}
                {item.role && (
                    <FieldRow label="Role">
                        <span className="capitalize">{item.role}</span>
                    </FieldRow>
                )}
            </div>
        </>
    );
}

interface PreviewBodyProps {
    type: EntityPreviewType;
    item: unknown;
}

export function EntityPreviewBody({ type, item }: PreviewBodyProps) {
    switch (type) {
        case "contact": return <ContactPreview item={item as ContactItem} />;
        case "company": return <CompanyPreview item={item as CompanyItem} />;
        case "job": return <JobPreview item={item as JobItem} />;
        case "invoice": return <InvoicePreview item={item as InvoiceItem} />;
        case "quote": return <QuotePreview item={item as QuoteItem} />;
        case "user": return <UserPreview item={item as UserItem} />;
    }
}

export function PreviewIcon({ type }: { type: EntityPreviewType }) {
    switch (type) {
        case "contact": return <UserIcon className="w-3.5 h-3.5" />;
        case "company": return <Building2 className="w-3.5 h-3.5" />;
        case "job": return <Briefcase className="w-3.5 h-3.5" />;
        case "invoice": return <Receipt className="w-3.5 h-3.5" />;
        case "quote": return <FileText className="w-3.5 h-3.5" />;
        case "user": return <UserIcon className="w-3.5 h-3.5" />;
    }
}
