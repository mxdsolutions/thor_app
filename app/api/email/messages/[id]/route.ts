import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphFetch } from "@/lib/microsoft-graph";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const res = await graphFetch(
            supabase,
            user.id,
            `/me/messages/${id}?$select=id,subject,body,from,toRecipients,ccRecipients,receivedDateTime,isRead,hasAttachments`
        );

        if (!res.ok) {
            const err = await res.json();
            return NextResponse.json({ error: err.error?.message || "Failed to fetch email" }, { status: res.status });
        }

        const message = await res.json();

        // Match sender/recipients against contacts
        const emailAddresses = new Set<string>();
        if (message.from?.emailAddress?.address) {
            emailAddresses.add(message.from.emailAddress.address.toLowerCase());
        }
        for (const r of [...(message.toRecipients || []), ...(message.ccRecipients || [])]) {
            if (r.emailAddress?.address) {
                emailAddresses.add(r.emailAddress.address.toLowerCase());
            }
        }

        const matchedContacts: Record<string, { id: string; first_name: string; last_name: string }> = {};
        if (emailAddresses.size > 0) {
            const { data: contacts } = await supabase
                .from("contacts")
                .select("id, first_name, last_name, email")
                .in("email", Array.from(emailAddresses));

            if (contacts) {
                for (const contact of contacts) {
                    if (contact.email) {
                        matchedContacts[contact.email.toLowerCase()] = {
                            id: contact.id,
                            first_name: contact.first_name,
                            last_name: contact.last_name,
                        };
                    }
                }
            }
        }

        // Mark as read if unread
        if (!message.isRead) {
            await graphFetch(supabase, user.id, `/me/messages/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ isRead: true }),
            }).catch(() => {}); // best-effort, don't fail the request
            message.isRead = true;
        }

        return NextResponse.json({ message, matchedContacts });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch email";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
