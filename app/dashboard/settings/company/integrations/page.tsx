"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { IconLink as LinkIcon, IconRefresh as ArrowPathIcon } from "@tabler/icons-react";
import { toast } from "sonner";
import { usePermissionOptional } from "@/lib/tenant-context";

export default function IntegrationsPage() {
    return (
        <Suspense>
            <IntegrationsContent />
        </Suspense>
    );
}

function IntegrationsContent() {
    // Page title set by company layout
    const searchParams = useSearchParams();

    // Outlook state
    const [outlookConnection, setOutlookConnection] = useState<{ email_address: string; created_at: string } | null>(null);
    const [outlookLoading, setOutlookLoading] = useState(true);
    const [outlookDisconnecting, setOutlookDisconnecting] = useState(false);

    // Xero state
    const canManageOutlook = usePermissionOptional("integrations.outlook.connect", "write", true);
    const canManageXero = usePermissionOptional("integrations.xero.connect", "write", true);
    const canSyncXero = usePermissionOptional("integrations.xero.sync", "write", true);

    const [xeroConnection, setXeroConnection] = useState<{ xero_tenant_name: string; last_sync_at: string | null; created_at: string } | null>(null);
    const [xeroLoading, setXeroLoading] = useState(true);
    const [xeroDisconnecting, setXeroDisconnecting] = useState(false);
    const [xeroSyncing, setXeroSyncing] = useState(false);
    const [orgPickerOpen, setOrgPickerOpen] = useState(false);
    const [xeroOrgs, setXeroOrgs] = useState<Array<{ id: string; name: string }>>([]);

    const fetchOutlookStatus = useCallback(async () => {
        try {
            const res = await fetch("/api/integrations/outlook");
            const data = await res.json();
            setOutlookConnection(data.connected ? data.connection : null);
        } catch {
            toast.error("Failed to check Outlook connection");
        } finally {
            setOutlookLoading(false);
        }
    }, []);

    const fetchXeroStatus = useCallback(async () => {
        try {
            const res = await fetch("/api/integrations/xero");
            const data = await res.json();
            setXeroConnection(data.connected ? data.connection : null);
        } catch {
            toast.error("Failed to check Xero connection");
        } finally {
            setXeroLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOutlookStatus();
        fetchXeroStatus();
    }, [fetchOutlookStatus, fetchXeroStatus]);

    useEffect(() => {
        // Outlook callbacks
        if (searchParams.get("success") === "true") {
            toast.success("Outlook connected successfully");
            fetchOutlookStatus();
        }
        const error = searchParams.get("error");
        if (error) toast.error(`Outlook connection failed: ${error}`);

        // Xero callbacks
        if (searchParams.get("xero_success") === "true") {
            toast.success("Xero connected successfully");
            fetchXeroStatus();
        }
        const xeroError = searchParams.get("xero_error");
        if (xeroError) toast.error(`Xero connection failed: ${xeroError}`);

        // Xero org selection
        if (searchParams.get("xero_select") === "true") {
            try {
                const orgs = JSON.parse(decodeURIComponent(searchParams.get("xero_orgs") || "[]"));
                setXeroOrgs(orgs);
                setOrgPickerOpen(true);
            } catch {
                toast.error("Failed to parse Xero organizations");
            }
        }
    }, [searchParams, fetchOutlookStatus, fetchXeroStatus]);

    const handleOutlookDisconnect = async () => {
        setOutlookDisconnecting(true);
        try {
            const res = await fetch("/api/integrations/outlook", { method: "DELETE" });
            if (!res.ok) throw new Error();
            setOutlookConnection(null);
            toast.success("Outlook disconnected");
        } catch {
            toast.error("Failed to disconnect");
        } finally {
            setOutlookDisconnecting(false);
        }
    };

    const handleXeroDisconnect = async () => {
        setXeroDisconnecting(true);
        try {
            const res = await fetch("/api/integrations/xero", { method: "DELETE" });
            if (!res.ok) throw new Error();
            setXeroConnection(null);
            toast.success("Xero disconnected");
        } catch {
            toast.error("Failed to disconnect");
        } finally {
            setXeroDisconnecting(false);
        }
    };

    const handleXeroSelectOrg = async (orgId: string, orgName: string) => {
        try {
            const res = await fetch("/api/integrations/xero/select-tenant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ xero_tenant_id: orgId, xero_tenant_name: orgName }),
            });
            if (!res.ok) throw new Error();
            setOrgPickerOpen(false);
            toast.success(`Connected to ${orgName}`);
            fetchXeroStatus();
        } catch {
            toast.error("Failed to select organization");
        }
    };

    const handleXeroSync = async () => {
        setXeroSyncing(true);
        try {
            const [contactsRes, invoicesRes] = await Promise.all([
                fetch("/api/integrations/xero/sync/contacts", { method: "POST" }),
                fetch("/api/integrations/xero/sync/invoices", { method: "POST" }),
            ]);
            const [contacts, invoices] = await Promise.all([contactsRes.json(), invoicesRes.json()]);

            const parts: string[] = [];
            if (contacts.created || contacts.updated) {
                parts.push(`Contacts: ${contacts.created} created, ${contacts.updated} updated`);
            }
            if (invoices.created || invoices.updated) {
                parts.push(`Invoices: ${invoices.created} created, ${invoices.updated} updated`);
            }
            toast.success(parts.length > 0 ? parts.join(". ") : "Everything is up to date");
            fetchXeroStatus();
        } catch {
            toast.error("Sync failed");
        } finally {
            setXeroSyncing(false);
        }
    };

    return (
        <DashboardPage>
            <div className="space-y-4">
                {/* Outlook Card */}
                <Card className="border-border shadow-none rounded-2xl">
                    <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                <svg viewBox="0 0 24 24" className="w-7 h-7 text-blue-600" fill="currentColor">
                                    <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.33.76.1.43.1.87zm-5.5-4.71v10.48L14 19.62V4.38zm2.64 6.46q0-.89.22-1.56.23-.68.65-1.14t1-.72q.58-.26 1.3-.26.7 0 1.28.25.57.25.98.72.4.47.63 1.14.23.67.23 1.56 0 .87-.23 1.55-.22.67-.62 1.14-.4.47-.98.72-.57.25-1.27.25-.72 0-1.3-.25-.58-.26-1-.72-.42-.46-.65-1.14-.22-.67-.22-1.54zm14.98-6.38v2.51h-3.38V8.37h3.38v2.5h-3.38v2.5h3.38v2.5h-3.38v2.5h3.38v2.5H16.5V7.38h3.5z"/>
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2.5 mb-1">
                                    <h3 className="text-base font-semibold">Microsoft Outlook</h3>
                                    {outlookConnection ? (
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                                            Connected
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            Not connected
                                        </Badge>
                                    )}
                                </div>
                                {outlookConnection ? (
                                    <p className="text-sm text-muted-foreground">
                                        Connected as <span className="font-medium text-foreground">{outlookConnection.email_address}</span>
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Connect your Outlook account to view and send emails from the CRM.
                                    </p>
                                )}
                            </div>
                            <div className="shrink-0 w-full sm:w-auto">
                                {outlookLoading ? (
                                    <Button variant="outline" size="sm" disabled className="w-full sm:w-auto">Loading...</Button>
                                ) : !canManageOutlook ? null : outlookConnection ? (
                                    <Button variant="outline" size="sm" className="w-full sm:w-auto text-destructive hover:text-destructive" onClick={handleOutlookDisconnect} disabled={outlookDisconnecting}>
                                        {outlookDisconnecting ? "Disconnecting..." : "Disconnect"}
                                    </Button>
                                ) : (
                                    <Button size="sm" className="w-full sm:w-auto" onClick={() => { window.location.href = "/api/integrations/outlook/authorize"; }}>
                                        <LinkIcon className="w-4 h-4 mr-1.5" />
                                        Connect
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Xero Card */}
                <Card className="border-border shadow-none rounded-2xl">
                    <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#13B5EA]/10 flex items-center justify-center shrink-0">
                                <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#13B5EA"/>
                                    <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2.5 mb-1">
                                    <h3 className="text-base font-semibold">Xero</h3>
                                    {xeroConnection ? (
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                                            Connected
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            Not connected
                                        </Badge>
                                    )}
                                </div>
                                {xeroConnection ? (
                                    <div className="space-y-0.5">
                                        <p className="text-sm text-muted-foreground">
                                            Connected to <span className="font-medium text-foreground">{xeroConnection.xero_tenant_name}</span>
                                        </p>
                                        {xeroConnection.last_sync_at && (
                                            <p className="text-xs text-muted-foreground">
                                                Last synced: {new Date(xeroConnection.last_sync_at).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Connect Xero to sync contacts, invoices, and quotes with your accounting.
                                    </p>
                                )}
                            </div>
                            <div className="shrink-0 flex gap-2 w-full sm:w-auto">
                                {xeroLoading ? (
                                    <Button variant="outline" size="sm" disabled className="flex-1 sm:flex-none">Loading...</Button>
                                ) : xeroConnection ? (
                                    <>
                                        {canSyncXero && (
                                            <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={handleXeroSync} disabled={xeroSyncing}>
                                                <ArrowPathIcon className={`w-4 h-4 mr-1.5 ${xeroSyncing ? "animate-spin" : ""}`} />
                                                {xeroSyncing ? "Syncing..." : "Sync Now"}
                                            </Button>
                                        )}
                                        {canManageXero && (
                                            <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-destructive hover:text-destructive" onClick={handleXeroDisconnect} disabled={xeroDisconnecting}>
                                                {xeroDisconnecting ? "Disconnecting..." : "Disconnect"}
                                            </Button>
                                        )}
                                    </>
                                ) : canManageXero ? (
                                    <Button size="sm" className="w-full sm:w-auto" onClick={() => { window.location.href = "/api/integrations/xero/authorize"; }}>
                                        <LinkIcon className="w-4 h-4 mr-1.5" />
                                        Connect
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Xero Org Picker Modal */}
            <Dialog open={orgPickerOpen} onOpenChange={setOrgPickerOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Select Xero Organization</DialogTitle>
                        <DialogDescription>
                            You have access to multiple Xero organizations. Select which one to connect.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 pt-2">
                        {xeroOrgs.map((org) => (
                            <button
                                key={org.id}
                                className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-accent transition-colors"
                                onClick={() => handleXeroSelectOrg(org.id, org.name)}
                            >
                                <span className="font-medium">{org.name}</span>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardPage>
    );
}
