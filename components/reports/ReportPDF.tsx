"use client";

import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image,
} from "@react-pdf/renderer";
import type { TemplateSchema, SectionDef, FieldDef } from "@/lib/report-templates/types";

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

type ReportData = {
    id: string;
    title: string;
    type: string;
    status: string;
    notes: string | null;
    created_at: string;
    data: Record<string, unknown>;
    job?: { id: string; job_title: string; description?: string | null } | null;
    company?: { id: string; name: string } | null;
};

interface ReportPDFProps {
    report: ReportData;
    template: { name: string; schema: TemplateSchema };
    tenant: TenantInfo;
}

const fmt = (n: number) =>
    new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

const TYPE_LABELS: Record<string, string> = {
    assessment: "Assessment",
    defect: "Defect",
    inspection: "Inspection",
    make_safe: "Make Safe",
    specialist: "Specialist",
    variation: "Variation",
    roof: "Roof",
    rectification: "Rectification",
    reinspection: "Reinspection",
    other: "Other",
};

const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: "Helvetica", fontSize: 9, color: "#1a1a1a" },
    // Header (same as QuotePDF)
    header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
    logo: { width: 80, height: 36, objectFit: "contain", objectPosition: "left" },
    companyName: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 2 },
    companyDetail: { fontSize: 8, color: "#666", lineHeight: 1.5 },
    // Title block
    titleBlock: { marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e5e5e5" },
    reportTitle: { fontSize: 18, fontFamily: "Helvetica-Bold" },
    reportSubtitle: { fontSize: 9, color: "#666", marginTop: 2 },
    // Info row
    infoRow: { flexDirection: "row", gap: 30, marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e5e5e5" },
    infoLabel: { fontSize: 7, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
    infoValue: { fontSize: 9, color: "#444" },
    // Sections
    section: { marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 8, paddingBottom: 4, borderBottomWidth: 0.5, borderBottomColor: "#e5e5e5" },
    sectionDesc: { fontSize: 8, color: "#666", marginBottom: 8 },
    // Fields
    fieldGrid: { flexDirection: "row", flexWrap: "wrap" },
    fieldFull: { width: "100%", marginBottom: 8 },
    fieldHalf: { width: "50%", marginBottom: 8, paddingRight: 8 },
    fieldLabel: { fontSize: 7, color: "#999", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 },
    fieldValue: { fontSize: 9, color: "#1a1a1a", lineHeight: 1.5 },
    fieldEmpty: { fontSize: 9, color: "#ccc", fontStyle: "italic" },
    // Repeater
    repeaterItem: { marginBottom: 10, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: "#e5e5e5" },
    repeaterLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#666", marginBottom: 4 },
    // Photos
    photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    photoContainer: { width: 120, marginBottom: 4 },
    photo: { width: 120, height: 90, objectFit: "cover", borderRadius: 2 },
    photoCaption: { fontSize: 7, color: "#666", marginTop: 2 },
    // Notes
    notesSection: { marginTop: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#e5e5e5" },
    notesLabel: { fontSize: 7, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
    notesText: { fontSize: 8.5, color: "#444", lineHeight: 1.6 },
    // Footer (same as QuotePDF)
    footer: { position: "absolute", bottom: 30, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#e0e0e0", paddingTop: 8 },
    footerText: { fontSize: 7, color: "#999" },
});

function formatFieldValue(field: FieldDef, value: unknown): string {
    if (value === null || value === undefined || value === "") return "";

    switch (field.type) {
        case "yes_no":
            return value === "yes" ? "Yes" : value === "no" ? "No" : String(value);
        case "checkbox":
            return value === true ? "Yes" : "No";
        case "currency":
            return typeof value === "number" ? fmt(value) : String(value);
        case "date":
            if (typeof value === "string" && value) {
                return new Date(value).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
            }
            return String(value);
        case "select":
            if (field.options) {
                const opt = field.options.find((o) => o.value === value);
                if (opt) return opt.label;
            }
            return String(value);
        case "entity_select":
            if (typeof value === "object" && value && "label" in value) {
                return (value as { label: string }).label;
            }
            return String(value);
        default:
            return String(value);
    }
}

function FieldRenderer({ field, value }: { field: FieldDef; value: unknown }) {
    if (field.type === "heading") return null;

    const width = field.width === "half" ? styles.fieldHalf : styles.fieldFull;

    if (field.type === "photo_upload") {
        const photos = Array.isArray(value) ? value : [];
        if (photos.length === 0) return null;
        return (
            <View style={styles.fieldFull}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <View style={styles.photoGrid}>
                    {photos.map((photo: { url: string; caption?: string; filename: string }, i: number) => (
                        <View key={i} style={styles.photoContainer}>
                            {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image does not support alt */}
                            <Image src={photo.url} style={styles.photo} />
                            {photo.caption && <Text style={styles.photoCaption}>{photo.caption}</Text>}
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    const display = formatFieldValue(field, value);

    return (
        <View style={width}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            {display ? (
                <Text style={styles.fieldValue}>{display}</Text>
            ) : (
                <Text style={styles.fieldEmpty}>—</Text>
            )}
        </View>
    );
}

function SectionRenderer({ section, data }: { section: SectionDef; data: Record<string, unknown> }) {
    const sectionData = data[section.id];

    if (section.type === "repeater") {
        const items = Array.isArray(sectionData) ? sectionData : [];
        if (items.length === 0) return null;

        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.description && <Text style={styles.sectionDesc}>{section.description}</Text>}
                {items.map((item: Record<string, unknown>, idx: number) => (
                    <View key={idx} style={styles.repeaterItem}>
                        <Text style={styles.repeaterLabel}>#{idx + 1}</Text>
                        <View style={styles.fieldGrid}>
                            {section.fields.map((field) => (
                                <FieldRenderer key={field.id} field={field} value={item[field.id]} />
                            ))}
                        </View>
                    </View>
                ))}
            </View>
        );
    }

    const fieldData = (sectionData && typeof sectionData === "object" && !Array.isArray(sectionData)
        ? sectionData
        : {}) as Record<string, unknown>;

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.description && <Text style={styles.sectionDesc}>{section.description}</Text>}
            <View style={styles.fieldGrid}>
                {section.fields.map((field) => (
                    <FieldRenderer key={field.id} field={field} value={fieldData[field.id]} />
                ))}
            </View>
        </View>
    );
}

export function ReportPDF({ report, template, tenant }: ReportPDFProps) {
    const companyName = tenant.company_name || tenant.name;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header: Company branding (same as QuotePDF) */}
                <View style={styles.header}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        {tenant.logo_url && (
                            // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image does not support alt
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
                    <Text style={styles.reportTitle}>{report.title}</Text>
                    <Text style={styles.reportSubtitle}>
                        Report #{report.id.slice(0, 8).toUpperCase()} — {template.name}
                    </Text>
                </View>

                {/* Info row */}
                <View style={styles.infoRow}>
                    <View>
                        <Text style={styles.infoLabel}>Date</Text>
                        <Text style={styles.infoValue}>
                            {new Date(report.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.infoLabel}>Type</Text>
                        <Text style={styles.infoValue}>{TYPE_LABELS[report.type] || report.type}</Text>
                    </View>
                    {report.job && (
                        <View>
                            <Text style={styles.infoLabel}>Job</Text>
                            <Text style={styles.infoValue}>{report.job.job_title}</Text>
                        </View>
                    )}
                    {report.company && (
                        <View>
                            <Text style={styles.infoLabel}>Company</Text>
                            <Text style={styles.infoValue}>{report.company.name}</Text>
                        </View>
                    )}
                </View>

                {/* Sections */}
                {template.schema.sections.map((section) => (
                    <SectionRenderer key={section.id} section={section} data={report.data} />
                ))}

                {/* Notes */}
                {report.notes && (
                    <View style={styles.notesSection}>
                        <Text style={styles.notesLabel}>Notes</Text>
                        <Text style={styles.notesText}>{report.notes}</Text>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>{companyName}</Text>
                    <Text style={styles.footerText}>
                        Report #{report.id.slice(0, 8).toUpperCase()} |{" "}
                        {new Date(report.created_at).toLocaleDateString("en-AU")}
                    </Text>
                </View>
            </Page>
        </Document>
    );
}
