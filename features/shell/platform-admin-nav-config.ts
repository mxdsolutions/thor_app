import { BarChart3 as ChartBarIcon, Building2 as BuildingOffice2Icon, FileText as DocumentTextIcon } from "lucide-react";
import type { LucideIcon as Icon } from "lucide-react";

export type PlatformAdminNavItem = {
    href: string;
    label: string;
    icon: Icon;
};

export const PLATFORM_ADMIN_NAV: PlatformAdminNavItem[] = [
    { href: "/platform-admin/dashboard", label: "Dashboard", icon: ChartBarIcon },
    { href: "/platform-admin/tenants", label: "Tenants", icon: BuildingOffice2Icon },
    { href: "/platform-admin/report-templates", label: "Report Templates", icon: DocumentTextIcon },
];
