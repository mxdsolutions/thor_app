import {
    IconChartBar as ChartBarIcon,
    IconBuildingSkyscraper as BuildingOffice2Icon,
    IconFileText as DocumentTextIcon,
} from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";

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
