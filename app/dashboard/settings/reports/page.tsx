import { redirect } from "next/navigation";

// Default sub-tab for the Reports top tab. Matches the pattern used by
// /dashboard/settings/company → /company/details.
export default function ReportsSettingsIndexPage() {
    redirect("/dashboard/settings/reports/templates");
}
