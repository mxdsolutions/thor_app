"use client";

import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image,
} from "@react-pdf/renderer";

type LineItem = {
    id: string;
    description: string;
    trade: string | null;
    uom: string | null;
    quantity: number;
    material_cost: number;
    labour_cost: number;
    unit_price: number;
};

type QuoteData = {
    id: string;
    title: string;
    description: string | null;
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
    tenant: TenantInfo;
}

const fmt = (n: number) =>
    new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

const GST_RATE = 0.1;

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: "Helvetica",
        fontSize: 9,
        color: "#1a1a1a",
    },
    // Header
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 30,
    },
    logo: { width: 80, height: 36, objectFit: "contain", objectPosition: "left" },
    companyName: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 2 },
    companyDetail: { fontSize: 8, color: "#666", lineHeight: 1.5 },
    // Quote title block
    titleBlock: {
        marginBottom: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e5e5",
    },
    quoteTitle: { fontSize: 18, fontFamily: "Helvetica-Bold" },
    quoteSubtitle: { fontSize: 9, color: "#666", marginTop: 2 },
    // From / To
    fromToRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 24,
    },
    fromToBlock: {
        width: "45%",
    },
    fromToLabel: { fontSize: 7, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
    fromToName: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 1 },
    fromToDetail: { fontSize: 8, color: "#555", lineHeight: 1.5 },
    // Info row
    infoRow: {
        flexDirection: "row",
        gap: 30,
        marginBottom: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e5e5",
    },
    infoBlock: {},
    infoLabel: { fontSize: 7, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
    infoValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },
    infoValueLight: { fontSize: 9, color: "#444" },
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
    tdMuted: { fontSize: 8.5, color: "#666" },
    tdBold: { fontSize: 8.5, fontFamily: "Helvetica-Bold" },
    // Column widths (no trade)
    colItem: { flex: 3 },
    colUom: { flex: 0.8 },
    colQty: { flex: 0.6, textAlign: "right" },
    colMat: { flex: 1.1, textAlign: "right" },
    colLab: { flex: 1.1, textAlign: "right" },
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
        marginTop: 24,
        paddingTop: 12,
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

export function QuotePDF({ quote, lineItems, tenant }: QuotePDFProps) {
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

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header: Company branding */}
                <View style={styles.header}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        {tenant.logo_url && (
                            <Image src={tenant.logo_url} style={[styles.logo, { marginRight: 10 }]} />
                        )}
                        <View>
                            <Text style={styles.companyName}>{companyName}</Text>
                            {tenant.abn && (
                                <Text style={styles.companyDetail}>ABN {tenant.abn}</Text>
                            )}
                        </View>
                    </View>
                    <View style={{ textAlign: "right" }}>
                        {tenant.address && <Text style={styles.companyDetail}>{tenant.address}</Text>}
                        {tenant.phone && <Text style={styles.companyDetail}>{tenant.phone}</Text>}
                        {tenant.email && <Text style={styles.companyDetail}>{tenant.email}</Text>}
                    </View>
                </View>

                {/* Title */}
                <View style={styles.titleBlock}>
                    <Text style={styles.quoteTitle}>{quote.title}</Text>
                    <Text style={styles.quoteSubtitle}>
                        Quote #{quote.id.slice(0, 8).toUpperCase()}
                    </Text>
                </View>

                {/* From / To */}
                <View style={styles.fromToRow}>
                    <View style={styles.fromToBlock}>
                        <Text style={styles.fromToLabel}>From</Text>
                        <Text style={styles.fromToName}>{companyName}</Text>
                        {tenant.address && <Text style={styles.fromToDetail}>{tenant.address}</Text>}
                        {tenant.phone && <Text style={styles.fromToDetail}>{tenant.phone}</Text>}
                        {tenant.email && <Text style={styles.fromToDetail}>{tenant.email}</Text>}
                        {tenant.abn && <Text style={styles.fromToDetail}>ABN {tenant.abn}</Text>}
                    </View>
                    {(quote.contact || quote.company) && (
                        <View style={styles.fromToBlock}>
                            <Text style={styles.fromToLabel}>To</Text>
                            {quote.contact && (
                                <>
                                    <Text style={styles.fromToName}>
                                        {quote.contact.first_name} {quote.contact.last_name}
                                    </Text>
                                    {quote.contact.job_title && (
                                        <Text style={styles.fromToDetail}>{quote.contact.job_title}</Text>
                                    )}
                                </>
                            )}
                            {quote.company && (
                                <Text style={styles.fromToDetail}>{quote.company.name}</Text>
                            )}
                            {quote.contact?.email && (
                                <Text style={styles.fromToDetail}>{quote.contact.email}</Text>
                            )}
                            {quote.contact?.phone && (
                                <Text style={styles.fromToDetail}>{quote.contact.phone}</Text>
                            )}
                        </View>
                    )}
                </View>

                {/* Date / Valid Until */}
                <View style={styles.infoRow}>
                    <View style={styles.infoBlock}>
                        <Text style={styles.infoLabel}>Date</Text>
                        <Text style={styles.infoValueLight}>
                            {new Date(quote.created_at).toLocaleDateString("en-AU", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                            })}
                        </Text>
                    </View>
                    {quote.valid_until && (
                        <View style={styles.infoBlock}>
                            <Text style={styles.infoLabel}>Valid Until</Text>
                            <Text style={styles.infoValueLight}>
                                {new Date(quote.valid_until).toLocaleDateString("en-AU", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Line items table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.th, styles.colItem]}>Item</Text>
                        <Text style={[styles.th, styles.colUom]}>UOM</Text>
                        <Text style={[styles.th, styles.colQty]}>Qty</Text>
                        <Text style={[styles.th, styles.colMat]}>Material</Text>
                        <Text style={[styles.th, styles.colLab]}>Labour</Text>
                        <Text style={[styles.th, styles.colTotal]}>Total</Text>
                    </View>
                    {lineItems.map((li, idx) => {
                        const lineTotal = li.quantity * (li.material_cost + li.labour_cost);
                        return (
                            <View
                                key={li.id}
                                style={[styles.tableRow, ...(idx % 2 === 1 ? [styles.tableRowAlt] : [])]}
                            >
                                <Text style={[styles.td, styles.colItem]}>{li.description}</Text>
                                <Text style={[styles.tdMuted, styles.colUom]}>{li.uom || "—"}</Text>
                                <Text style={[styles.td, styles.colQty]}>{li.quantity}</Text>
                                <Text style={[styles.tdMuted, styles.colMat]}>{fmt(li.material_cost)}</Text>
                                <Text style={[styles.tdMuted, styles.colLab]}>{fmt(li.labour_cost)}</Text>
                                <Text style={[styles.tdBold, styles.colTotal]}>{fmt(lineTotal)}</Text>
                            </View>
                        );
                    })}
                </View>

                {/* Summary */}
                <View style={styles.summaryContainer}>
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
                    <View style={styles.notesSection}>
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
