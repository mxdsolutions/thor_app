"use client";

import { toast } from "sonner";
import type { TemplateSchema } from "./types";
import { generateFakeReportData } from "./fake-data";
import type {
    ReportPDFProps,
    ReportPDFReportData,
    ReportPDFTenantInfo,
} from "@/components/reports/ReportPDF";

/** Display name used when the template has no tenant assigned yet. */
const PREVIEW_TENANT_NAME = "Sample tenant";

interface TenantPreviewBranding {
    company_name?: string | null;
    name?: string | null;
    logo_url?: string | null;
    report_cover_url?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    abn?: string | null;
    primary_color?: string | null;
}

interface PreviewArgs {
    templateName: string;
    schema: TemplateSchema;
    /** Template-level cover override. Wins over the tenant's default. */
    templateCoverUrl: string | null;
    /** Tenant branding (logo, address, default cover, etc). Pass `null` when
     *  the template hasn't been assigned a tenant yet. */
    tenant: TenantPreviewBranding | null;
}

/**
 * Render the template through the real `ReportPDF` component using fake data,
 * apply the same PDF-or-image cover handling as the production report
 * download, and open the result in a new tab.
 *
 * Mirrors the pipeline in `components/sheets/ReportSideSheet.tsx` so what the
 * platform admin sees here is exactly what the tradie's client will see in
 * production — minus the real submission data.
 */
export async function renderTemplatePreviewPdf({
    templateName,
    schema,
    templateCoverUrl,
    tenant,
}: PreviewArgs): Promise<void> {
    const fakeData = generateFakeReportData(schema);

    // Cover precedence: template override → tenant default → none.
    const coverUrl = templateCoverUrl ?? tenant?.report_cover_url ?? null;
    const coverIsPdf = coverUrl
        ? coverUrl.split("?")[0].toLowerCase().endsWith(".pdf")
        : false;

    const [{ pdf }, { ReportPDF }, { createElement }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/reports/ReportPDF"),
        import("react"),
    ]);

    const reportData: ReportPDFReportData = {
        id: "preview",
        title: templateName || "Untitled template",
        type: "preview",
        status: "preview",
        notes: null,
        created_at: new Date().toISOString(),
        data: fakeData,
    };
    const tenantData: ReportPDFTenantInfo = {
        company_name: tenant?.company_name ?? null,
        name: tenant?.name ?? PREVIEW_TENANT_NAME,
        logo_url: tenant?.logo_url ?? null,
        // Only pass image covers to react-pdf; PDF covers are merged
        // separately below via pdf-lib.
        report_cover_url: coverIsPdf ? null : coverUrl,
        address: tenant?.address ?? null,
        phone: tenant?.phone ?? null,
        email: tenant?.email ?? null,
        abn: tenant?.abn ?? null,
        primary_color: tenant?.primary_color ?? "#000000",
    };
    const props: ReportPDFProps = {
        report: reportData,
        template: { name: templateName || "Untitled template", schema },
        tenant: tenantData,
        skipCover: coverIsPdf,
    };
    const element = createElement(ReportPDF, props);

    let blob = await pdf(element as unknown as Parameters<typeof pdf>[0]).toBlob();

    if (coverIsPdf && coverUrl) {
        // Distinguish three failure modes:
        //   1. `pdf-lib` chunk failed to load (network / module error)
        //   2. cover-fetch failed (404, CORS, etc.)
        //   3. pdf-lib's merge threw
        // The user-visible toast differs because the remediation differs:
        // a chunk failure is usually transient (retry), a fetch failure
        // means the cover URL is wrong, a merge failure means the cover
        // PDF itself is malformed.
        let PDFDocument: typeof import("pdf-lib").PDFDocument;
        try {
            PDFDocument = (await import("pdf-lib")).PDFDocument;
        } catch (err) {
            console.error("Failed to load pdf-lib chunk", err);
            toast.warning("Couldn't load PDF tools — opened preview without the cover");
            PDFDocument = null as never;
        }

        if (PDFDocument) {
            try {
                const [contentBytes, coverRes] = await Promise.all([
                    blob.arrayBuffer(),
                    fetch(coverUrl),
                ]);
                if (!coverRes.ok) throw new Error("Failed to fetch cover PDF");
                const coverBytes = await coverRes.arrayBuffer();

                const merged = await PDFDocument.create();
                const coverDoc = await PDFDocument.load(coverBytes);
                const contentDoc = await PDFDocument.load(contentBytes);

                const coverPages = await merged.copyPages(coverDoc, coverDoc.getPageIndices());
                coverPages.forEach((p) => merged.addPage(p));
                const contentPages = await merged.copyPages(contentDoc, contentDoc.getPageIndices());
                contentPages.forEach((p) => merged.addPage(p));

                const mergedBytes = await merged.save();
                blob = new Blob([mergedBytes as unknown as BlobPart], { type: "application/pdf" });
            } catch (err) {
                console.error("Failed to merge PDF cover", err);
                toast.warning("Couldn't prepend PDF cover — opened preview without it");
            }
        }
    }

    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
}
