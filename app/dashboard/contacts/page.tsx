"use client";

import { useState, useCallback } from "react";
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { useMobileHeaderAction } from "@/lib/mobile-header-action-context";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import { TablePagination } from "@/components/dashboard/TablePagination";
import { DataTable, DataTableColumn } from "@/components/dashboard/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconSearch as MagnifyingGlassIcon, IconPlus as PlusIcon } from "@tabler/icons-react";
import { CreateContactModal } from "@/components/modals/CreateContactModal";
import { ContactSideSheet } from "@/components/sheets/ContactSideSheet";
import { useContacts, type ArchiveScope } from "@/lib/swr";
import { ArchiveScopedStatusSelect } from "@/components/dashboard/ArchiveScopedStatusSelect";
import { useDebouncedValue } from "@/lib/hooks/use-debounce";
import { EntityPreviewCard } from "@/components/entity-preview/EntityPreviewCard";

type Contact = {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    job_title: string | null;
    type: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postcode: string | null;
    status: string;
    company?: { id: string; name: string } | null;
    created_at: string;
};

const columns: DataTableColumn<Contact>[] = [
    {
        key: "name",
        label: "Name",
        render: (c) => (
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-xs text-foreground ring-1 ring-border/50 shrink-0">
                    {c.first_name[0]}{c.last_name[0]}
                </div>
                <span className="font-semibold truncate">{c.first_name} {c.last_name}</span>
            </div>
        ),
    },
    { key: "email", label: "Email", muted: true, className: "hidden sm:table-cell truncate max-w-[200px]", render: (c) => c.email || "—" },
    {
        key: "company",
        label: "Company",
        render: (c) => c.company ? (
            <EntityPreviewCard entityType="company" entityId={c.company.id}>
                <span className="truncate">{c.company.name}</span>
            </EntityPreviewCard>
        ) : <span className="truncate">—</span>,
    },
    { key: "jobTitle", label: "Job Title", muted: true, className: "hidden sm:table-cell", render: (c) => c.job_title || "—" },
    {
        key: "status",
        label: "Status",
        className: "hidden sm:table-cell",
        render: (c) => (
            <div className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", c.status === "active" ? "bg-emerald-500" : "bg-amber-500")} />
                <span className="font-medium text-muted-foreground capitalize">{c.status}</span>
            </div>
        ),
    },
];

export default function ContactsPage() {
    usePageTitle("Contacts");
    const [showCreate, setShowCreate] = useState(false);
    useMobileHeaderAction(useCallback(() => setShowCreate(true), []));
    const [search, setSearch] = useState("");
    const [archiveScope, setArchiveScope] = useState<ArchiveScope>("active");
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 20;
    const debouncedSearch = useDebouncedValue(search);
    const { data, isLoading, error, mutate } = useContacts(debouncedSearch || undefined, page * PAGE_SIZE, PAGE_SIZE, archiveScope);
    const contacts: Contact[] = data?.items || [];
    const total: number = data?.total || 0;
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

    return (
        <>
            <ScrollableTableLayout
                header={
                    <div className="space-y-4">
                        <div className="px-4 md:px-6 lg:px-10">
                            <h1 className="font-statement text-2xl font-extrabold tracking-tight">Contacts</h1>
                        </div>
                        <DashboardControls>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="relative flex-1 min-w-0 md:min-w-[320px] md:max-w-xl">
                                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search contacts..."
                                    className="pl-9 rounded-xl border-border/50"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <ArchiveScopedStatusSelect
                                archive={archiveScope}
                                onArchiveChange={setArchiveScope}
                                status="All"
                                onStatusChange={() => { }}
                                statuses={[]}
                            />
                        </div>
                        <Button className="px-6 shrink-0 hidden md:inline-flex" onClick={() => setShowCreate(true)}>
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Add Contact
                        </Button>
                    </DashboardControls>
                    </div>
                }
                footer={<TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
            >
                <DataTable
                    items={contacts}
                    columns={columns}
                    loading={isLoading}
                    error={error}
                    emptyMessage="No contacts found."
                    onRowClick={setSelectedContact}
                />
            </ScrollableTableLayout>

            <CreateContactModal
                open={showCreate}
                onOpenChange={setShowCreate}
                onCreated={() => mutate()}
            />

            <ContactSideSheet
                contact={selectedContact}
                open={!!selectedContact}
                onOpenChange={(open) => { if (!open) setSelectedContact(null); }}
            />
        </>
    );
}
