"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import {
    tableBase,
    tableHead,
    tableHeadCell,
    tableRow,
    tableCell,
    tableCellMuted,
} from "@/lib/design-system";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import {
    IconSearch as MagnifyingGlassIcon,
    IconPlus as PlusIcon,
    IconArrowUpRight as ArrowUpRightIcon,
} from "@tabler/icons-react";
import { CreateContactModal } from "@/components/modals/CreateContactModal";
import { ContactSideSheet } from "@/components/sheets/ContactSideSheet";
import { CreateCompanyModal } from "@/components/modals/CreateCompanyModal";
import { CompanySideSheet } from "@/components/sheets/CompanySideSheet";
import { useContacts, useCompanies } from "@/lib/swr";
import { useDebouncedValue } from "@/lib/hooks/use-debounce";
import { TableSkeleton } from "@/components/ui/skeleton";

type Contact = {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    job_title: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postcode: string | null;
    status: string;
    company?: { id: string; name: string } | null;
    created_at: string;
};

type Company = {
    id: string;
    name: string;
    industry: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
    state: string | null;
    status: string;
    created_at: string;
};

type Tab = "contacts" | "companies";

export default function ClientsPage() {
    return (
        <Suspense>
            <ClientsPageContent />
        </Suspense>
    );
}

function ClientsPageContent() {
    usePageTitle("Clients");
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialTab = (searchParams.get("tab") === "companies" ? "companies" : "contacts") as Tab;
    const [tab, setTab] = useState<Tab>(initialTab);

    const handleTabChange = (next: Tab) => {
        setTab(next);
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", next);
        router.replace(`/dashboard/clients?${params.toString()}`);
    };

    // Contacts state
    const [contactsSearch, setContactsSearch] = useState("");
    const debouncedContactsSearch = useDebouncedValue(contactsSearch);
    const { data: contactsData, isLoading: contactsLoading, mutate: mutateContacts } = useContacts(debouncedContactsSearch || undefined);
    const contacts: Contact[] = contactsData?.items || [];
    const [showCreateContact, setShowCreateContact] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

    // Companies state
    const [companiesSearch, setCompaniesSearch] = useState("");
    const debouncedCompaniesSearch = useDebouncedValue(companiesSearch);
    const { data: companiesData, isLoading: companiesLoading, mutate: mutateCompanies } = useCompanies(debouncedCompaniesSearch || undefined);
    const companies: Company[] = companiesData?.items || [];
    const [showCreateCompany, setShowCreateCompany] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    const tabSwitcher = (
        <SegmentedControl
            value={tab}
            onChange={handleTabChange}
            options={[
                { value: "contacts", label: "Contacts" },
                { value: "companies", label: "Companies" },
            ]}
        />
    );

    const contactsHeader = (
        <DashboardControls>
            <div className="flex items-center gap-3">
                <div className="relative flex-1 min-w-[320px] max-w-xl">
                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search contacts..."
                        className="pl-9 rounded-xl border-border/50"
                        value={contactsSearch}
                        onChange={(e) => setContactsSearch(e.target.value)}
                    />
                </div>
                {tabSwitcher}
            </div>
            <Button className="px-6 shrink-0" onClick={() => setShowCreateContact(true)}>
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Contact
            </Button>
        </DashboardControls>
    );

    const companiesHeader = (
        <DashboardControls>
            <div className="flex items-center gap-3">
                <div className="relative flex-1 min-w-[320px] max-w-xl">
                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search companies..."
                        className="pl-9 rounded-xl border-border/50"
                        value={companiesSearch}
                        onChange={(e) => setCompaniesSearch(e.target.value)}
                    />
                </div>
                {tabSwitcher}
            </div>
            <Button className="px-6 shrink-0" onClick={() => setShowCreateCompany(true)}>
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Company
            </Button>
        </DashboardControls>
    );

    const contactsTable = (
        <table className={tableBase + " border-collapse min-w-full"}>
            <thead className={tableHead + " sticky top-0 z-10"}>
                <tr>
                    <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Name</th>
                    <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Email</th>
                    <th className={tableHeadCell + " px-4"}>Company</th>
                    <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Position</th>
                    <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Status</th>
                    <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right"}></th>
                </tr>
            </thead>
            <tbody>
                {contactsLoading ? (
                    <TableSkeleton rows={8} columns={6} />
                ) : contacts.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No contacts found.</td>
                    </tr>
                ) : (
                    contacts.map((contact) => (
                        <tr key={contact.id} className={tableRow + " group cursor-pointer"} onClick={() => setSelectedContact(contact)}>
                            <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-xs text-foreground ring-1 ring-border/50 shrink-0">
                                        {contact.first_name[0]}{contact.last_name[0]}
                                    </div>
                                    <span className="font-semibold truncate">
                                        {contact.first_name} {contact.last_name}
                                    </span>
                                </div>
                            </td>
                            <td className={tableCellMuted + " px-4 hidden sm:table-cell truncate max-w-[200px]"}>
                                {contact.email || "—"}
                            </td>
                            <td className={tableCell + " px-4"}>
                                <span className="text-sm truncate">{contact.company?.name || "—"}</span>
                            </td>
                            <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                {contact.job_title || "—"}
                            </td>
                            <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        contact.status === "active" ? "bg-emerald-500" : "bg-amber-500"
                                    )} />
                                    <span className="text-xs font-medium text-muted-foreground capitalize">
                                        {contact.status}
                                    </span>
                                </div>
                            </td>
                            <td className={tableCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right md:opacity-0 md:group-hover:opacity-100 transition-opacity"}>
                                <Button variant="ghost" size="icon" aria-label="Open contact" className="rounded-lg h-8 w-8 text-muted-foreground">
                                    <ArrowUpRightIcon className="w-4 h-4" />
                                </Button>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    );

    const companiesTable = (
        <table className={tableBase + " border-collapse min-w-full"}>
            <thead className={tableHead + " sticky top-0 z-10"}>
                <tr>
                    <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Company</th>
                    <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Industry</th>
                    <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Location</th>
                    <th className={tableHeadCell + " px-4"}>Phone</th>
                    <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Status</th>
                    <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right"}></th>
                </tr>
            </thead>
            <tbody>
                {companiesLoading ? (
                    <TableSkeleton rows={8} columns={6} />
                ) : companies.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No companies found.</td>
                    </tr>
                ) : (
                    companies.map((company) => (
                        <tr key={company.id} className={tableRow + " group cursor-pointer"} onClick={() => setSelectedCompany(company)}>
                            <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center font-bold text-xs text-foreground ring-1 ring-border/50 shrink-0">
                                        {company.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold truncate">{company.name}</p>
                                        {company.email && <p className="text-xs text-muted-foreground truncate">{company.email}</p>}
                                    </div>
                                </div>
                            </td>
                            <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                {company.industry || "—"}
                            </td>
                            <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                {[company.city, company.state].filter(Boolean).join(", ") || "—"}
                            </td>
                            <td className={tableCellMuted + " px-4"}>
                                {company.phone || "—"}
                            </td>
                            <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        company.status === "active" ? "bg-emerald-500" : "bg-amber-500"
                                    )} />
                                    <span className="text-xs font-medium text-muted-foreground capitalize">
                                        {company.status}
                                    </span>
                                </div>
                            </td>
                            <td className={tableCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right md:opacity-0 md:group-hover:opacity-100 transition-opacity"}>
                                <Button variant="ghost" size="icon" aria-label="Open company" className="rounded-lg h-8 w-8 text-muted-foreground">
                                    <ArrowUpRightIcon className="w-4 h-4" />
                                </Button>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    );

    return (
        <>
            <ScrollableTableLayout header={tab === "contacts" ? contactsHeader : companiesHeader}>
                {tab === "contacts" ? contactsTable : companiesTable}
            </ScrollableTableLayout>

            <CreateContactModal
                open={showCreateContact}
                onOpenChange={setShowCreateContact}
                onCreated={() => mutateContacts()}
            />
            <ContactSideSheet
                contact={selectedContact}
                open={!!selectedContact}
                onOpenChange={(open) => { if (!open) setSelectedContact(null); }}
            />

            <CreateCompanyModal
                open={showCreateCompany}
                onOpenChange={setShowCreateCompany}
                onCreated={() => mutateCompanies()}
            />
            <CompanySideSheet
                company={selectedCompany}
                open={!!selectedCompany}
                onOpenChange={(open) => { if (!open) setSelectedCompany(null); }}
            />
        </>
    );
}
