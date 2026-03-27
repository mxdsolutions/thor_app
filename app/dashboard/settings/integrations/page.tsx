"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardPage, DashboardHeader } from "@/components/dashboard/DashboardPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

export default function IntegrationsPage() {
    return (
        <Suspense>
            <IntegrationsContent />
        </Suspense>
    );
}

function IntegrationsContent() {
    const searchParams = useSearchParams();
    const [connection, setConnection] = useState<{ email_address: string; created_at: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await fetch("/api/integrations/outlook");
            const data = await res.json();
            if (data.connected) {
                setConnection(data.connection);
            } else {
                setConnection(null);
            }
        } catch {
            toast.error("Failed to check connection status");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    useEffect(() => {
        if (searchParams.get("success") === "true") {
            toast.success("Outlook connected successfully");
            fetchStatus();
        }
        const error = searchParams.get("error");
        if (error) {
            toast.error(`Connection failed: ${error}`);
        }
    }, [searchParams]);

    const handleDisconnect = async () => {
        setDisconnecting(true);
        try {
            const res = await fetch("/api/integrations/outlook", { method: "DELETE" });
            if (!res.ok) throw new Error();
            setConnection(null);
            toast.success("Outlook disconnected");
        } catch {
            toast.error("Failed to disconnect");
        } finally {
            setDisconnecting(false);
        }
    };

    return (
        <DashboardPage>
            <DashboardHeader
                title="Integrations"
                subtitle="Connect external services to your workspace."
            />

            <div className="px-4 md:px-6 lg:px-10">
                <Card className="border-border shadow-none rounded-2xl">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            {/* Outlook icon */}
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                <svg viewBox="0 0 24 24" className="w-7 h-7 text-blue-600" fill="currentColor">
                                    <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.33.76.1.43.1.87zm-5.5-4.71v10.48L14 19.62V4.38zm2.64 6.46q0-.89.22-1.56.23-.68.65-1.14t1-.72q.58-.26 1.3-.26.7 0 1.28.25.57.25.98.72.4.47.63 1.14.23.67.23 1.56 0 .87-.23 1.55-.22.67-.62 1.14-.4.47-.98.72-.57.25-1.27.25-.72 0-1.3-.25-.58-.26-1-.72-.42-.46-.65-1.14-.22-.67-.22-1.54zm14.98-6.38v2.51h-3.38V8.37h3.38v2.5h-3.38v2.5h3.38v2.5h-3.38v2.5h3.38v2.5H16.5V7.38h3.5z"/>
                                </svg>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2.5 mb-1">
                                    <h3 className="text-base font-semibold">Microsoft Outlook</h3>
                                    {connection ? (
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

                                {connection ? (
                                    <p className="text-sm text-muted-foreground">
                                        Connected as <span className="font-medium text-foreground">{connection.email_address}</span>
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Connect your Outlook account to view and send emails from the CRM.
                                    </p>
                                )}
                            </div>

                            <div className="shrink-0">
                                {loading ? (
                                    <Button variant="outline" size="sm" disabled className="rounded-full">
                                        Loading...
                                    </Button>
                                ) : connection ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full text-destructive hover:text-destructive"
                                        onClick={handleDisconnect}
                                        disabled={disconnecting}
                                    >
                                        {disconnecting ? "Disconnecting..." : "Disconnect"}
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        className="rounded-full"
                                        onClick={() => {
                                            window.location.href = "/api/integrations/outlook/authorize";
                                        }}
                                    >
                                        <LinkIcon className="w-4 h-4 mr-1.5" />
                                        Connect
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardPage>
    );
}
