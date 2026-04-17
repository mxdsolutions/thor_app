"use client";

import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";

export type PdfTenantInfo = {
    company_name: string | null;
    name: string;
    logo_url: string | null;
    phone: string | null;
    email: string | null;
    abn: string | null;
};

const styles = StyleSheet.create({
    header: {
        position: "absolute",
        top: 30,
        left: 40,
        right: 40,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingBottom: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: "#e5e5e5",
    },
    logo: { width: 140, height: 55, objectFit: "contain", objectPosition: "left" },
    right: { alignItems: "flex-end" },
    companyName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1a1a1a", marginBottom: 2 },
    detail: { fontSize: 8, color: "#666", lineHeight: 1.4 },
    detailLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
});

/**
 * Top padding the <Page> must reserve so the fixed letterhead doesn't overlap
 * content. Pair with PdfLetterhead on every PDF that uses it.
 */
export const LETTERHEAD_PAGE_PADDING_TOP = 115;

/**
 * Shared letterhead for every tenant-generated PDF (reports, quotes, invoices).
 * Renders once per Page and repeats on subsequent pages via react-pdf's `fixed`
 * prop. Layout: logo on the left, tenant name/phone/email/ABN on the right.
 */
export function PdfLetterhead({ tenant, fixed = true }: { tenant: PdfTenantInfo; fixed?: boolean }) {
    const companyName = tenant.company_name || tenant.name;
    return (
        <View style={styles.header} fixed={fixed}>
            <View>
                {tenant.logo_url && (
                    // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image does not support alt
                    <Image src={tenant.logo_url} style={styles.logo} />
                )}
            </View>
            <View style={styles.right}>
                <Text style={styles.companyName}>{companyName}</Text>
                {tenant.phone && (
                    <Text style={styles.detail}>
                        <Text style={styles.detailLabel}>Phone: </Text>
                        {tenant.phone}
                    </Text>
                )}
                {tenant.email && (
                    <Text style={styles.detail}>
                        <Text style={styles.detailLabel}>Email: </Text>
                        {tenant.email}
                    </Text>
                )}
                {tenant.abn && (
                    <Text style={styles.detail}>
                        <Text style={styles.detailLabel}>ABN: </Text>
                        {tenant.abn}
                    </Text>
                )}
            </View>
        </View>
    );
}
