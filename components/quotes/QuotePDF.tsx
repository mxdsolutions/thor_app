"use client";

import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
} from "@react-pdf/renderer";
import { PdfLetterhead, LETTERHEAD_PAGE_PADDING_TOP } from "@/components/pdf/PdfLetterhead";

type LineItem = {
    id: string;
    description: string;
    line_description?: string | null;
    trade: string | null;
    uom: string | null;
    quantity: number;
    material_cost: number;
    labour_cost: number;
    unit_price: number;
    section_id?: string | null;
    sort_order?: number;
};

type Section = {
    id: string;
    name: string;
    sort_order: number;
};

type QuoteData = {
    id: string;
    title: string;
    description: string | null;
    scope_description?: string | null;
    status: string;
    total_amount: number;
    valid_until: string | null;
    material_margin: number | null;
    labour_margin: number | null;
    gst_inclusive: boolean | null;
    created_at: string;
    company?: { id: string; name: string } | null;
    contact?: { id: string; first_name: string; last_name: string; email?: string | null; phone?: string | null; job_title?: string | null } | null;
};

type TenantInfo = {
    company_name: string | null;
    name: string;
    logo_url: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    abn: string | null;
    primary_color: string;
};

interface QuotePDFProps {
    quote: QuoteData;
    lineItems: LineItem[];
    sections?: Section[];
    tenant: TenantInfo;
}

const fmt = (n: number) =>
    new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

const GST_RATE = 0.1;

const styles = StyleSheet.create({
    page: {
        paddingTop: LETTERHEAD_PAGE_PADDING_TOP,
        paddingBottom: 40,
        paddingHorizontal: 40,
        fontFamily: "Helvetica",
        fontSize: 9,
        color: "#1a1a1a",
    },
    // Quote title block
    titleBlock: {
        marginBottom: 16,
    },
    quoteTitle: { fontSize: 18, fontFamily: "Helvetica-Bold" },
    quoteSubtitle: { fontSize: 9, color: "#666", marginTop: 2 },
    // To + Date row (compact)
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e5e5",
    },
    toBlock: {
        width: "55%",
    },
    datesBlock: {
        width: "40%",
        alignItems: "flex-end",
    },
    infoLabel: { fontSize: 7, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
    infoName: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 1 },
    infoDetail: { fontSize: 8, color: "#555", lineHeight: 1.5 },
    infoValue: { fontSize: 9, color: "#444" },
    // Scope description
    scopeBlock: {
        marginBottom: 14,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e5e5",
    },
    scopeLabel: { fontSize: 7, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
    scopeText: { fontSize: 8.5, color: "#333", lineHeight: 1.6 },
    // Table
    table: {
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#f5f5f5",
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 0.5,
        borderBottomColor: "#eee",
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    tableRowAlt: {
        backgroundColor: "#fafafa",
    },
    th: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#666", textTransform: "uppercase", letterSpacing: 0.3 },
    td: { fontSize: 8.5 },
    tdSub: { fontSize: 7.5, color: "#777", marginTop: 1 },
    tdMuted: { fontSize: 8.5, color: "#666" },
    tdBold: { fontSize: 8.5, fontFamily: "Helvetica-Bold" },
    // Section header row
    sectionHeader: {
        flexDirection: "row",
        backgroundColor: "#eaeaea",
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
        marginTop: 4,
    },
    sectionHeaderText: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        color: "#333",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    // Column widths
    colItem: { flex: 3 },
    colUom: { flex: 0.8 },
    colQty: { flex: 0.8, textAlign: "right" },
    colTotal: { flex: 1.2, textAlign: "right" },
    // Summary
    summaryContainer: {
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    summaryBox: {
        width: 220,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        borderRadius: 4,
        padding: 12,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 3,
    },
    summaryLabel: { fontSize: 8.5, color: "#666" },
    summaryValue: { fontSize: 8.5, fontFamily: "Helvetica-Bold" },
    summaryDivider: {
        borderBottomWidth: 1,
        borderBottomColor: "#e5e5e5",
        marginVertical: 4,
    },
    summaryTotal: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingTop: 6,
    },
    summaryTotalLabel: { fontSize: 11, fontFamily: "Helvetica-Bold" },
    summaryTotalValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
    // Notes
    notesSection: {
        marginTop: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#e5e5e5",
    },
    notesLabel: { fontSize: 7, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
    notesText: { fontSize: 8.5, color: "#444", lineHeight: 1.6 },
    // Footer
    footer: {
        position: "absolute",
        bottom: 30,
        left: 40,
        right: 40,
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 0.5,
        borderTopColor: "#e0e0e0",
        paddingTop: 8,
    },
    footerText: { fontSize: 7, color: "#999" },
});

export function QuotePDF({ quote, lineItems, sections = [], tenant }: QuotePDFProps) {
    const materialMargin = quote.material_margin ?? 20;
    const labourMargin = quote.labour_margin ?? 20;
    const gstInclusive = quote.gst_inclusive ?? true;

    let materialSum = 0;
    let labourSum = 0;
    for (const li of lineItems) {
        materialSum += li.quantity * li.material_cost;
        labourSum += li.quantity * li.labour_cost;
    }
    const materialWithMargin = materialSum * (1 + materialMargin / 100);
    const labourWithMargin = labourSum * (1 + labourMargin / 100);
    const subtotal = materialWithMargin + labourWithMargin;
    const gst = gstInclusive ? subtotal / 11 : subtotal * GST_RATE;
    const grandTotal = gstInclusive ? subtotal : subtotal + gst;

    const companyName = tenant.company_name || tenant.name;

    // Group items by section for rendering
    const sortedSections = [...sections].sort((a, b) => a.sort_order - b.sort_order);
    const unsectionedItems = lineItems
        .filter(li => !li.section_id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const hasSections = sortedSections.length > 0;

    const renderLineItem = (li: LineItem, idx: number) => {
        const lineTotal = li.quantity * (li.material_cost + li.labour_cost);
        return (
            <View
                key={li.id}
                style={[styles.tableRow, ...(idx % 2 === 1 ? [styles.tableRowAlt] : [])]}
            >
                <View style={styles.colItem}>
                    <Text style={styles.td}>{li.description}</Text>
                    {li.line_description ? <Text style={styles.tdSub}>{li.line_description}</Text> : null}
                </View>
                <Text style={[styles.tdMuted, styles.colUom]}>{li.uom || "—"}</Text>
                <Text style={[styles.td, styles.colQty]}>{li.quantity}</Text>
                <Text style={[styles.tdBold, styles.colTotal]}>{fmt(lineTotal)}</Text>
            </View>
        );
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <PdfLetterhead tenant={tenant} />

                {/* Title */}
                <View style={styles.titleBlock}>
                    <Text style={styles.quoteTitle}>{quote.title}</Text>
                    <Text style={styles.quoteSubtitle}>
                        Quote #{quote.id.slice(0, 8).toUpperCase()}
                    </Text>
                </View>

                {/* To + Dates in one compact row */}
                <View style={styles.infoRow}>
                    {(quote.contact || quote.company) ? (
                        <View style={styles.toBlock}>
                            <Text style={styles.infoLabel}>To</Text>
                            {quote.contact && (
                                <>
                                    <Text style={styles.infoName}>
                                        {quote.contact.first_name} {quote.contact.last_name}
                                    </Text>
                                    {quote.contact.job_title && (
                                        <Text style={styles.infoDetail}>{quote.contact.job_title}</Text>
                                    )}
                                </>
                            )}
                            {quote.company && (
                                <Text style={styles.infoDetail}>{quote.company.name}</Text>
                            )}
                            {quote.contact?.email && (
                                <Text style={styles.infoDetail}>{quote.contact.email}</Text>
                            )}
                            {quote.contact?.phone && (
                                <Text style={styles.infoDetail}>{quote.contact.phone}</Text>
                            )}
                        </View>
                    ) : <View style={styles.toBlock} />}

                    <View style={styles.datesBlock}>
                        <Text style={styles.infoLabel}>Date</Text>
                        <Text style={styles.infoValue}>
                            {new Date(quote.created_at).toLocaleDateString("en-AU", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                            })}
                        </Text>
                        {quote.valid_until && (
                            <>
                                <Text style={[styles.infoLabel, { marginTop: 6 }]}>Valid Until</Text>
                                <Text style={styles.infoValue}>
                                    {new Date(quote.valid_until).toLocaleDateString("en-AU", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </Text>
                            </>
                        )}
                    </View>
                </View>

                {/* Scope description */}
                {quote.scope_description && (
                    <View style={styles.scopeBlock}>
                        <Text style={styles.scopeLabel}>Scope of Work</Text>
                        <Text style={styles.scopeText}>{quote.scope_description}</Text>
                    </View>
                )}

                {/* Line items table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.th, styles.colItem]}>Item</Text>
                        <Text style={[styles.th, styles.colUom]}>UOM</Text>
                        <Text style={[styles.th, styles.colQty]}>Qty</Text>
                        <Text style={[styles.th, styles.colTotal]}>Total</Text>
                    </View>

                    {/* Unsectioned items first (backward compat) */}
                    {unsectionedItems.map((li, idx) => renderLineItem(li, idx))}

                    {/* Sectioned items */}
                    {sortedSections.map((section) => {
                        const sectionItems = lineItems
                            .filter(li => li.section_id === section.id)
                            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
                        if (sectionItems.length === 0 && !hasSections) return null;
                        return (
                            <View key={section.id}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionHeaderText}>{section.name}</Text>
                                </View>
                                {sectionItems.map((li, idx) => renderLineItem(li, idx))}
                            </View>
                        );
                    })}
                </View>

                {/* Summary — wrap={false} prevents splitting across pages */}
                <View style={styles.summaryContainer} wrap={false}>
                    <View style={styles.summaryBox}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Subtotal</Text>
                            <Text style={styles.summaryValue}>{fmt(gstInclusive ? subtotal - gst : subtotal)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>GST (10%)</Text>
                            <Text style={styles.summaryValue}>{fmt(gst)}</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryTotal}>
                            <Text style={styles.summaryTotalLabel}>Total {gstInclusive ? "(Inc. GST)" : "(Exc. GST)"}</Text>
                            <Text style={styles.summaryTotalValue}>{fmt(grandTotal)}</Text>
                        </View>
                    </View>
                </View>

                {/* Notes / Description */}
                {quote.description && (
                    <View style={styles.notesSection} wrap={false}>
                        <Text style={styles.notesLabel}>Notes</Text>
                        <Text style={styles.notesText}>{quote.description}</Text>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>{companyName}</Text>
                    <Text style={styles.footerText}>
                        Quote #{quote.id.slice(0, 8).toUpperCase()} |{" "}
                        {new Date(quote.created_at).toLocaleDateString("en-AU")}
                    </Text>
                </View>
            </Page>
        </Document>
    );
}
