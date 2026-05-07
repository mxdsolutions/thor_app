import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { graphFetch, OutlookReauthRequired } from "@/lib/microsoft-graph";

export const GET = withAuth(async (request, { supabase, user, tenantId }) => {
    const searchParams = request.nextUrl.searchParams;
    const allowedFolders = ["inbox", "drafts", "sentitems", "deleteditems", "junkemail", "archive"];
    const folderParam = searchParams.get("folder") || "inbox";
    const folder = allowedFolders.includes(folderParam) ? folderParam : "inbox";
    const search = searchParams.get("search") || "";
    const top = String(Math.min(Math.max(parseInt(searchParams.get("top") || "25") || 25, 1), 100));
    const skip = String(Math.max(parseInt(searchParams.get("skip") || "0") || 0, 0));

    try {
        let endpoint: string;
        const headers: Record<string, string> = {};

        const select = "$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead,hasAttachments";

        if (search) {
            endpoint = `/me/messages?$top=${top}&${select}&$search="${encodeURIComponent(search)}"`;
            headers["ConsistencyLevel"] = "eventual";
        } else {
            endpoint = `/me/mailFolders/${folder}/messages?$top=${top}&$skip=${skip}&$orderby=receivedDateTime desc&${select}`;
        }

        const res = await graphFetch(supabase, user.id, endpoint, { headers, tenantId });

        if (!res.ok) {
            const err = await res.json();
            return NextResponse.json({ error: err.error?.message || "Failed to fetch emails" }, { status: res.status });
        }

        const data = await res.json();
        const messages = data.value || [];

        const emailAddresses = new Set<string>();
        for (const msg of messages) {
            if (msg.from?.emailAddress?.address) {
                emailAddresses.add(msg.from.emailAddress.address.toLowerCase());
            }
            for (const to of msg.toRecipients || []) {
                if (to.emailAddress?.address) {
                    emailAddresses.add(to.emailAddress.address.toLowerCase());
                }
            }
        }

        const matchedContacts: Record<string, { id: string; first_name: string; last_name: string }> = {};
        if (emailAddresses.size > 0) {
            const { data: contacts } = await supabase
                .from("contacts")
                .select("id, first_name, last_name, email")
                .eq("tenant_id", tenantId)
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

        return NextResponse.json({
            messages,
            matchedContacts,
            nextSkip: Number(skip) + Number(top),
            hasMore: !!data["@odata.nextLink"],
        });
    } catch (err: unknown) {
        if (err instanceof OutlookReauthRequired) {
            return NextResponse.json({ error: err.message, code: "OUTLOOK_REAUTH_REQUIRED" }, { status: 401 });
        }
        const message = err instanceof Error ? err.message : "Failed to fetch emails";
        return NextResponse.json({ error: message }, { status: 500 });
    }
});
