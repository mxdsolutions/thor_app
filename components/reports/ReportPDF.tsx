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
import { PdfLetterhead, LETTERHEAD_PAGE_PADDING_TOP } from "@/components/pdf/PdfLetterhead";

type TenantInfo = {
    company_name: string | null;
    name: string;
    logo_url: string | null;
    report_cover_url?: string | null;
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
    creator?: { id: string; full_name: string } | null;
};

interface ReportPDFProps {
    report: ReportData;
    template: { name: string; schema: TemplateSchema };
    tenant: TenantInfo;
    /** Name shown under "Assessed by" on the generated cover. Falls back to report.creator. */
    assessorName?: string | null;
    /** Date shown on the generated cover. Falls back to report.created_at. */
    completedAt?: string | null;
    /** When true, no cover page is rendered at all. Used when a PDF cover will be
     *  prepended by pdf-lib after render — react-pdf's <Image> can't embed PDFs. */
    skipCover?: boolean;
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
    // Extra top padding leaves room for the fixed letterhead on every page.
    page: { paddingTop: LETTERHEAD_PAGE_PADDING_TOP, paddingBottom: 60, paddingHorizontal: 40, fontFamily: "Helvetica", fontSize: 11, color: "#1a1a1a" },

    // --- Cover page ---
    coverPage: { padding: 0, margin: 0 },
    coverImage: { width: "100%", height: "100%", objectFit: "cover" },
    // Fallback / generated cover
    coverFallback: {
        flex: 1,
        paddingHorizontal: 60,
        paddingTop: 160,
        paddingBottom: 80,
        alignItems: "center",
        justifyContent: "space-between",
    },
    coverLogoWrap: { alignItems: "center", justifyContent: "center" },
    coverLogo: { maxWidth: 240, maxHeight: 120, objectFit: "contain" },
    coverBody: { alignItems: "center", width: "100%" },
    coverTitle: {
        fontSize: 32,
        fontFamily: "Helvetica-Bold",
        textAlign: "center",
        marginBottom: 28,
        lineHeight: 1.2,
    },
    coverMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 0,
    },
    coverMetaItem: { fontSize: 11, color: "#444" },
    coverMetaBullet: { fontSize: 11, color: "#999", marginHorizontal: 8 },
    coverFooter: { fontSize: 9, color: "#888", textAlign: "center" },

    // --- Content page title block ---
    titleBlock: { marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e5e5e5" },
    reportTitle: { fontSize: 20, fontFamily: "Helvetica-Bold" },
    reportSubtitle: { fontSize: 10, color: "#666", marginTop: 4 },

    // --- Info row ---
    infoRow: { flexDirection: "row", gap: 30, marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e5e5e5" },
    infoLabel: { fontSize: 8, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
    infoValue: { fontSize: 11, color: "#444" },

    // --- Sections ---
    section: { marginBottom: 18 },
    sectionTitleBar: {
        backgroundColor: "#f2f2f2",
        marginLeft: -40,
        marginRight: -40,
        paddingVertical: 8,
        paddingHorizontal: 40,
        marginBottom: 10,
    },
    sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
    sectionDesc: { fontSize: 10, color: "#666", marginBottom: 10 },

    // --- Fields — row layout: bold label on the left, value on the right,
    //     with a faint grey divider between each row.
    fieldGrid: { flexDirection: "column" },
    fieldRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 7,
        borderBottomWidth: 0.5,
        borderBottomColor: "#e5e5e5",
        gap: 16,
    },
    fieldLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1a1a1a", width: "40%" },
    fieldValue: { fontSize: 11, color: "#1a1a1a", lineHeight: 1.5, flex: 1 },
    fieldEmpty: { fontSize: 11, color: "#ccc", fontStyle: "italic", flex: 1 },
    // Photo fields keep a vertical layout (label on top, photo grid beneath)
    photoField: {
        paddingVertical: 7,
        borderBottomWidth: 0.5,
        borderBottomColor: "#e5e5e5",
    },
    photoFieldLabel: {
        fontSize: 11,
        fontFamily: "Helvetica-Bold",
        color: "#1a1a1a",
        marginBottom: 6,
    },

    // --- Repeater ---
    repeaterItem: { marginBottom: 12, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: "#e5e5e5" },
    repeaterLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#666", marginBottom: 6 },

    // --- Photos ---
    photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    photoContainer: { width: 140, marginBottom: 6 },
    photo: { width: 140, height: 105, objectFit: "cover", borderRadius: 2 },
    photoCaption: { fontSize: 8, color: "#666", marginTop: 2 },

    // --- Notes ---
    notesSection: { marginTop: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#e5e5e5" },
    notesLabel: { fontSize: 8, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
    notesText: { fontSize: 10.5, color: "#444", lineHeight: 1.6 },

    // --- Footer ---
    footer: { position: "absolute", bottom: 30, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#e0e0e0", paddingTop: 8 },
    footerText: { fontSize: 8, color: "#999" },
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

    if (field.type === "photo_upload") {
        const photos = Array.isArray(value) ? value : [];
        if (photos.length === 0) return null;
        return (
            <View style={styles.photoField}>
                <Text style={styles.photoFieldLabel}>{field.label}</Text>
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
        <View style={styles.fieldRow}>
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
    const sectionData = data?.[section.id];

    if (section.type === "repeater") {
        const items = Array.isArray(sectionData) ? sectionData : [];
        if (items.length === 0) return null;

        return (
            // wrap={false} keeps the whole section on a single page; if it won't fit,
            // react-pdf moves it to the next page instead of splitting mid-section.
            <View style={styles.section} wrap={false}>
                <View style={styles.sectionTitleBar}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
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
        <View style={styles.section} wrap={false}>
            <View style={styles.sectionTitleBar}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            {section.description && <Text style={styles.sectionDesc}>{section.description}</Text>}
            <View style={styles.fieldGrid}>
                {section.fields.map((field) => (
                    <FieldRenderer key={field.id} field={field} value={fieldData[field.id]} />
                ))}
            </View>
        </View>
    );
}

function GeneratedCoverPage({
    tenant,
    report,
    assessorName,
    completedAt,
}: {
    tenant: TenantInfo;
    report: ReportData;
    assessorName?: string | null;
    completedAt?: string | null;
}) {
    const companyName = tenant.company_name || tenant.name;
    const assessor = assessorName || report.creator?.full_name || null;
    const completedDate = completedAt || report.created_at;
    const formattedDate = new Date(completedDate).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
    const reportNumber = report.id.slice(0, 8).toUpperCase();

    const metaParts: string[] = [];
    if (assessor) metaParts.push(`Assessed by ${assessor}`);
    metaParts.push(`Completed ${formattedDate}`);
    metaParts.push(`Report #${reportNumber}`);

    return (
        <Page size="A4" style={styles.coverPage}>
            <View style={styles.coverFallback}>
                <View style={styles.coverLogoWrap}>
                    {tenant.logo_url && (
                        // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image does not support alt
                        <Image src={tenant.logo_url} style={styles.coverLogo} />
                    )}
                </View>

                <View style={styles.coverBody}>
                    <Text style={styles.coverTitle}>{report.title}</Text>
                    <View style={styles.coverMetaRow}>
                        {metaParts.map((part, i) => (
                            <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
                                {i > 0 && <Text style={styles.coverMetaBullet}>•</Text>}
                                <Text style={styles.coverMetaItem}>{part}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <Text style={styles.coverFooter}>{companyName}</Text>
            </View>
        </Page>
    );
}

function CustomCoverPage({ coverUrl }: { coverUrl: string }) {
    return (
        <Page size="A4" style={styles.coverPage}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image does not support alt */}
            <Image src={coverUrl} style={styles.coverImage} />
        </Page>
    );
}

export function ReportPDF({ report, template, tenant, assessorName, completedAt, skipCover }: ReportPDFProps) {
    const companyName = tenant.company_name || tenant.name;

    return (
        <Document>
            {/* --- Cover: uploaded image if provided, otherwise generated --- */}
            {!skipCover && (
                tenant.report_cover_url ? (
                    <CustomCoverPage coverUrl={tenant.report_cover_url} />
                ) : (
                    <GeneratedCoverPage
                        tenant={tenant}
                        report={report}
                        assessorName={assessorName}
                        completedAt={completedAt}
                    />
                )
            )}

            {/* --- Content --- */}
            <Page size="A4" style={styles.page}>
                <PdfLetterhead tenant={tenant} />

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
                {template.schema.sections.map((section, i) => (
                    <SectionRenderer
                        key={`${section.id}-${i}`}
                        section={section}
                        data={(report.data || {}) as Record<string, unknown>}
                    />
                ))}

                {/* Notes */}
                {report.notes && (
                    <View style={styles.notesSection} wrap={false}>
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
