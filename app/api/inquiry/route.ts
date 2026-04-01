import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const MATT_USER_ID = "f63fc07f-6bd3-49db-a0cd-069e8989b19c";

const inquirySchema = z.object({
    name: z.string().min(1).max(200),
    company: z.string().min(1).max(200),
    email: z.string().email().max(320),
    phone: z.string().min(6).max(30),
    services: z.string().max(1000).optional(),
    message: z.string().max(5000).optional(),
    source: z.string().max(100).optional(),
    // Honeypot — must be empty
    _gotcha: z.string().max(0).optional(),
});

function extractDomain(email: string): string {
    return email.split("@")[1]?.toLowerCase() ?? "";
}

function splitName(name: string): { first_name: string; last_name: string } {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return { first_name: parts[0], last_name: "" };
    return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

export async function POST(request: Request) {
    // Only allow POST
    const origin = request.headers.get("origin") ?? "";

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const validation = inquirySchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            { error: "Validation failed", details: validation.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    // Honeypot check — bots fill hidden fields
    if (validation.data._gotcha) {
        // Silently accept to not tip off the bot
        return NextResponse.json({ success: true }, { status: 200 });
    }

    const { name, company, email, phone, services, message, source } = validation.data;
    const domain = extractDomain(email);
    const { first_name, last_name } = splitName(name);

    const supabase = await createAdminClient();

    // 1. Find or create contact by phone
    const { data: existingContact } = await supabase
        .from("contacts")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();

    let contactId: string;

    if (existingContact) {
        contactId = existingContact.id;
    } else {
        const { data: newContact, error: contactError } = await supabase
            .from("contacts")
            .insert({
                first_name,
                last_name,
                email,
                phone,
                status: "active",
                created_by: MATT_USER_ID,
            })
            .select("id")
            .single();

        if (contactError || !newContact) {
            console.error("Failed to create contact:", contactError);
            return NextResponse.json({ error: "Failed to process inquiry" }, { status: 500 });
        }
        contactId = newContact.id;
    }

    // 2. Find or create company by domain
    let companyId: string | null = null;

    if (domain) {
        const { data: existingCompany } = await supabase
            .from("companies")
            .select("id")
            .ilike("website", `%${domain}%`)
            .maybeSingle();

        if (existingCompany) {
            companyId = existingCompany.id;
        } else {
            const { data: newCompany, error: companyError } = await supabase
                .from("companies")
                .insert({
                    name: company,
                    website: domain,
                    email,
                    status: "active",
                    created_by: MATT_USER_ID,
                })
                .select("id")
                .single();

            if (companyError || !newCompany) {
                console.error("Failed to create company:", companyError);
                return NextResponse.json({ error: "Failed to process inquiry" }, { status: 500 });
            }
            companyId = newCompany.id;
        }

        // Link contact to company if not already linked
        if (companyId && !existingContact) {
            await supabase
                .from("contacts")
                .update({ company_id: companyId })
                .eq("id", contactId);
        }
    }

    // 3. Create lead
    const servicesLabel = services
        ? services.split(",").map(s => s.trim().replace(/-/g, " ")).join(", ")
        : "";

    const leadTitle = `Website Inquiry — ${company}`;
    const leadDescription = [
        message && `Message: ${message}`,
        servicesLabel && `Services: ${servicesLabel}`,
        source && `Source page: ${source}`,
    ].filter(Boolean).join("\n\n");

    const { data: lead, error: leadError } = await supabase
        .from("leads")
        .insert({
            title: leadTitle,
            description: leadDescription || null,
            source: "website",
            status: "new",
            priority: "medium",
            contact_id: contactId,
            company_id: companyId,
            assigned_to: MATT_USER_ID,
            created_by: MATT_USER_ID,
        })
        .select("id")
        .single();

    if (leadError || !lead) {
        console.error("Failed to create lead:", leadError);
        return NextResponse.json({ error: "Failed to process inquiry" }, { status: 500 });
    }

    // Log activity
    await supabase.from("activity_logs").insert({
        entity_type: "lead",
        entity_id: lead.id,
        action: "created",
        changes: { source: "website_inquiry", services, original_message: message },
        performed_by: MATT_USER_ID,
    });

    const corsHeaders = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };

    return NextResponse.json(
        { success: true },
        { status: 201, headers: corsHeaders }
    );
}

// Handle CORS preflight
export async function OPTIONS(request: Request) {
    const origin = request.headers.get("origin") ?? "";
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400",
        },
    });
}
