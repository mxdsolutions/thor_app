"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReportWizardShell } from "@/components/reports/wizard/ReportWizardShell";
import { ExternalReportHeader } from "@/components/reports/ExternalReportHeader";
import { makeExternalUploader } from "@/components/reports/UploadContext";
import { useTenantOptional } from "@/lib/tenant-context";
import type { TemplateSchema } from "@/lib/report-templates/types";
import type { TenantBranding } from "@/lib/tenant";

type ActivePayload = {
    state: "active";
    report: { id: string; title: string; type: string; status: string; data: Record<string, unknown> };
    template: { id: string; name: string; schema: TemplateSchema };
    tenant: TenantBranding;
    share: {
        expires_at: string;
        message: string | null;
        recipient_name: string | null;
        submitted_at: string | null;
        submitted_by_name: string | null;
        submitted_by_email: string | null;
    };
};

type StateOnlyPayload = {
    state: "revoked" | "expired" | "archived";
    tenant: { name: string; company_name: string | null } | null;
};

type LoadResponse = ActivePayload | StateOnlyPayload;

export default function ExternalReportPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const tenant = useTenantOptional();
    const [state, setState] = useState<
        | { kind: "loading" }
        | { kind: "missing" }
        | { kind: "state-only"; payload: StateOnlyPayload }
        | { kind: "ready"; payload: ActivePayload }
    >({ kind: "loading" });
    const [view, setView] = useState<"form" | "submitted">("form");
    const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
    // Identity collected on first submit; re-used silently for subsequent edits.
    const [identity, setIdentity] = useState<{ name: string; email: string } | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/public/reports/${encodeURIComponent(token)}`);
                if (cancelled) return;
                if (res.status === 404) {
                    setState({ kind: "missing" });
                    return;
                }
                if (!res.ok) {
                    setState({ kind: "missing" });
                    return;
                }
                const payload = (await res.json()) as LoadResponse;
                if (cancelled) return;
                if (payload.state === "active") {
                    setState({ kind: "ready", payload });
                    if (payload.share.submitted_at) {
                        setView("submitted");
                        if (payload.share.submitted_by_email && payload.share.submitted_by_name) {
                            setIdentity({
                                name: payload.share.submitted_by_name,
                                email: payload.share.submitted_by_email,
                            });
                        }
                    }
                } else {
                    setState({ kind: "state-only", payload });
                }
            } catch {
                if (!cancelled) setState({ kind: "missing" });
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    const handleSave = useCallback(async (data: Record<string, unknown>) => {
        const res = await fetch(`/api/public/reports/${encodeURIComponent(token)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data }),
        });
        if (res.status === 410) {
            // Server killed the link mid-edit (revoked/expired/archived) — bounce.
            const body = await res.json().catch(() => null);
            const newState = (body && typeof body === "object" && "state" in body && typeof body.state === "string"
                ? body.state
                : "expired") as "revoked" | "expired" | "archived";
            setState({ kind: "state-only", payload: { state: newState, tenant: tenant ?? null } });
            throw new Error("Link no longer accepts edits");
        }
        if (!res.ok) throw new Error("Failed to save");
    }, [token, tenant]);

    const handleSubmit = useCallback(async (data: Record<string, unknown>, name: string, email: string) => {
        const res = await fetch(`/api/public/reports/${encodeURIComponent(token)}/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data, submitted_by_name: name, submitted_by_email: email }),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => null);
            throw new Error(body?.error || "Failed to submit");
        }
    }, [token]);

    const uploader = useMemo(() => makeExternalUploader(token), [token]);

    if (state.kind === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
        );
    }

    if (state.kind === "missing") {
        return <UnavailableScreen title="Link unavailable" body="This link is no longer valid. Ask the sender for a new one." />;
    }

    if (state.kind === "state-only") {
        return <StateExplainer payload={state.payload} />;
    }

    const { payload } = state;
    const schema: TemplateSchema = payload.template.schema?.version === 1
        ? payload.template.schema
        : { version: 1, sections: [] };

    if (view === "submitted") {
        return (
            <SubmittedPanel
                payload={payload}
                schema={schema}
                onEdit={() => setView("form")}
            />
        );
    }

    return (
        <>
            <ReportWizardShell
                reportId={payload.report.id}
                reportTitle={payload.report.title}
                // Always editable while in form view — soft-submit means the
                // recipient can keep tweaking data even after first submission.
                // The submitted/locked rendering happens at the page level via
                // the SubmittedPanel, not via the wizard's internal readOnly.
                reportStatus="in_progress"
                schema={schema}
                initialData={payload.report.data || {}}
                tenantId={payload.tenant?.id}
                uploader={uploader}
                mode="external"
                hideTopBar
                skipRedirectOnSubmit
                headerSlot={
                    <ExternalReportHeader
                        reportTitle={payload.report.title}
                        senderName={null}
                        senderMessage={payload.share.message}
                        saveStatus="idle"
                        locked={false}
                    />
                }
                onSave={handleSave}
                onSubmit={async (data) => {
                    let creds = identity;
                    if (!creds) {
                        creds = await new Promise<{ name: string; email: string } | null>((resolve) => {
                            setSubmitDialogOpen(true);
                            const h = (e: Event) => {
                                const detail = (e as CustomEvent<{ name: string; email: string } | null>).detail;
                                window.removeEventListener("external-submit-resolve", h);
                                resolve(detail);
                            };
                            window.addEventListener("external-submit-resolve", h);
                        });
                        setSubmitDialogOpen(false);
                        if (!creds) throw new Error("Cancelled");
                        setIdentity(creds);
                    }
                    await handleSubmit(data, creds.name, creds.email);
                }}
                onSubmitted={() => setView("submitted")}
            />

            <SubmitIdentityDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen} />
        </>
    );
}

function SubmitIdentityDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    useEffect(() => {
        if (!open) {
            setName("");
            setEmail("");
        }
    }, [open]);

    if (!open) return null;

    const handleConfirm = () => {
        if (!name.trim() || !email.trim() || !email.includes("@")) {
            toast.error("Please enter your name and a valid email");
            return;
        }
        window.dispatchEvent(new CustomEvent("external-submit-resolve", { detail: { name: name.trim(), email: email.trim() } }));
    };

    const handleCancel = () => {
        window.dispatchEvent(new CustomEvent("external-submit-resolve", { detail: null }));
        onOpenChange(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg">
                <h2 className="text-lg font-display font-semibold mb-1">Before you submit</h2>
                <p className="text-sm text-muted-foreground mb-4">Tell us who&apos;s submitting this so we can attribute the report.</p>
                <div className="space-y-3">
                    <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Your name</label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" />
                    </div>
                    <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Your email</label>
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-5">
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={handleCancel}>Cancel</Button>
                    <Button size="sm" className="rounded-lg" onClick={handleConfirm}>Submit report</Button>
                </div>
            </div>
        </div>
    );
}

function SubmittedPanel({
    payload,
    schema,
    onEdit,
}: {
    payload: ActivePayload;
    schema: TemplateSchema;
    onEdit: () => void;
}) {
    const tenant = useTenantOptional();
    const [downloading, setDownloading] = useState(false);

    const expiry = new Date(payload.share.expires_at).toLocaleDateString("en-AU", {
        day: "numeric", month: "long", year: "numeric",
    });

    const handleDownload = async () => {
        if (!tenant) return;
        setDownloading(true);
        try {
            const [{ pdf }, { ReportPDF }] = await Promise.all([
                import("@react-pdf/renderer"),
                import("@/components/reports/ReportPDF"),
            ]);
            const { createElement } = await import("react");
            const element = createElement(ReportPDF, {
                report: {
                    id: payload.report.id,
                    title: payload.report.title,
                    type: payload.report.type,
                    status: payload.report.status,
                    notes: null,
                    created_at: new Date().toISOString(),
                    data: payload.report.data || {},
                } as Parameters<typeof ReportPDF>[0]["report"],
                template: { name: payload.template.name, schema },
                tenant: {
                    company_name: tenant.company_name,
                    name: tenant.name,
                    logo_url: tenant.logo_url,
                    report_cover_url: null,
                    address: tenant.address,
                    phone: tenant.phone,
                    email: tenant.email,
                    abn: tenant.abn,
                    primary_color: tenant.primary_color || "#000000",
                },
                skipCover: false,
            });
            const blob = await pdf(element as unknown as Parameters<typeof pdf>[0]).toBlob();
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
        } catch (err) {
            console.error(err);
            toast.error("Couldn't generate PDF");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <ExternalReportHeader
                reportTitle={payload.report.title}
                senderMessage={null}
                senderName={null}
                saveStatus="idle"
                locked
            />
            <div className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="max-w-md w-full text-center space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-display font-semibold">Submitted</h1>
                    <p className="text-sm text-muted-foreground">
                        {tenant?.company_name || tenant?.name || "The team"} has been notified.
                        You can come back and edit this form anytime before <strong>{expiry}</strong>.
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:justify-center gap-2 pt-2">
                        <Button variant="outline" onClick={onEdit} className="rounded-lg">
                            Edit submission
                        </Button>
                        <Button onClick={handleDownload} disabled={downloading} className="rounded-lg">
                            {downloading ? "Generating…" : "Download a copy (PDF)"}
                        </Button>
                    </div>
                </div>
            </div>
            <footer className="border-t border-border bg-secondary/40 py-3 text-center text-[11px] text-muted-foreground">
                Powered by THOR — industrial CRM for trades
            </footer>
        </div>
    );
}

function StateExplainer({ payload }: { payload: StateOnlyPayload }) {
    const tenant = payload.tenant;
    const tenantName = tenant?.company_name || tenant?.name || "the sender";

    let title = "Link unavailable";
    let body = "This link is no longer valid.";
    if (payload.state === "revoked") {
        title = "Link revoked";
        body = `${tenantName} has revoked this link. Get in touch with them if you still need to complete the report.`;
    } else if (payload.state === "expired") {
        title = "Link expired";
        body = `This link has expired. Ask ${tenantName} to send you a fresh one.`;
    } else if (payload.state === "archived") {
        title = "Report closed";
        body = `${tenantName} has closed this report. Get in touch if you need to access it.`;
    }

    return (
        <div className="min-h-screen flex flex-col">
            <ExternalReportHeader reportTitle={title} senderMessage={null} senderName={null} saveStatus="idle" locked />
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                <h1 className="text-xl font-display font-semibold mb-2">{title}</h1>
                <p className="text-sm text-muted-foreground max-w-md">{body}</p>
            </div>
            <footer className="border-t border-border bg-secondary/40 py-3 text-center text-[11px] text-muted-foreground">
                Powered by THOR — industrial CRM for trades
            </footer>
        </div>
    );
}

function UnavailableScreen({ title, body }: { title: string; body: string }) {
    const tenant = useTenantOptional();
    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
            {tenant?.logo_url && (
                <Image src={tenant.logo_url} alt={tenant.name} width={120} height={40} unoptimized className="h-10 w-auto mb-6 object-contain" />
            )}
            <h1 className="text-xl font-display font-semibold mb-2">{title}</h1>
            <p className="text-sm text-muted-foreground max-w-md">{body}</p>
        </div>
    );
}
