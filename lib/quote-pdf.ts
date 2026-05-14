import type { TenantContextData } from "@/lib/tenant-context";

/**
 * Fetch the full quote (with company/contact/job joins), its sections and
 * line items, then render the QuotePDF to a Blob. Used by the quote side
 * sheet and the row kebab so both produce identical PDFs.
 *
 * `react-pdf` and the PDF component are dynamically imported so this helper
 * stays cheap to call from pages that don't end up generating a PDF.
 */
export async function generateQuotePdfBlob(
    quoteId: string,
    tenant: TenantContextData
): Promise<Blob> {
    const [quoteRes, liRes, secRes] = await Promise.all([
        fetch(`/api/quotes?limit=200`),
        fetch(`/api/quote-line-items?quote_id=${quoteId}`),
        fetch(`/api/quote-sections?quote_id=${quoteId}`),
    ]);
    const [quoteData, liData, secData] = await Promise.all([
        quoteRes.json(),
        liRes.json(),
        secRes.json(),
    ]);
    const fullQuote = quoteData.items?.find((q: { id: string }) => q.id === quoteId);
    if (!fullQuote) {
        throw new Error("Quote not found");
    }
    const lineItems = liData.lineItems || liData.items || [];
    const sections = secData.sections || secData.items || [];

    const [{ pdf }, { QuotePDF }, { createElement }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/quotes/QuotePDF"),
        import("react"),
    ]);
    const element = createElement(QuotePDF, {
        quote: fullQuote,
        lineItems,
        sections,
        tenant,
    });
    return pdf(element as unknown as Parameters<typeof pdf>[0]).toBlob();
}
