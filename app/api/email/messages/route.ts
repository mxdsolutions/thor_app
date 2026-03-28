import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphFetch } from "@/lib/microsoft-graph";

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const allowedFolders = ["inbox", "drafts", "sentitems", "deleteditems", "junkemail", "archive"];
    const folderParam = searchParams.get("folder") || "inbox";
    const folder = allowedFolders.includes(folderParam) ? folderParam : "inbox";
    const search = searchParams.get("search") || "";
    const top = String(Math.min(Math.max(parseInt(searchParams.get("top") || "25") || 25, 1), 100));
    const skip = String(Math.max(parseInt(searchParams.get("skip") || "0") || 0, 0));

    try {
        let endpoint: string;
        let headers: Record<string, string> = {};

        const select = "$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead,hasAttachments";

        if (search) {
            // $search requires ConsistencyLevel header and cannot combine with $orderby
            // Use /me/messages (not mailFolders) for broader search scope
            endpoint = `/me/messages?$top=${top}&${select}&$search="${encodeURIComponent(search)}"`;
            headers["ConsistencyLevel"] = "eventual";
        } else {
            endpoint = `/me/mailFolders/${folder}/messages?$top=${top}&$skip=${skip}&$orderby=receivedDateTime desc&${select}`;
        }

        const res = await graphFetch(supabase, user.id, endpoint, { headers });

        if (!res.ok) {
            const err = await res.json();
            return NextResponse.json({ error: err.error?.message || "Failed to fetch emails" }, { status: res.status });
        }

        const data = await res.json();
        const messages = data.value || [];

        // Extract email addresses for CRM matching
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

        // Match against contacts
        let matchedContacts: Record<string, { id: string; first_name: string; last_name: string }> = {};
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

        return NextResponse.json({
            messages,
            matchedContacts,
            nextSkip: Number(skip) + Number(top),
            hasMore: !!data["@odata.nextLink"],
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
