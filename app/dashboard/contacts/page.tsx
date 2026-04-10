"use client";

import { useState } from "react";
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import {
    tableBase,
    tableHead,
    tableHeadCell,
    tableRow,
    tableCell,
    tableCellMuted
} from "@/lib/design-system";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconSearch as MagnifyingGlassIcon, IconPlus as PlusIcon, IconArrowUpRight as ArrowUpRightIcon } from "@tabler/icons-react";
import { CreateContactModal } from "@/components/modals/CreateContactModal";
import { ContactSideSheet } from "@/components/sheets/ContactSideSheet";
import { useContacts } from "@/lib/swr";
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
    company?: {
        id: string;
        name: string;
    } | null;
    created_at: string;
};

export default function ContactsPage() {
    usePageTitle("Contacts");
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search);
    const { data, isLoading: loading, mutate } = useContacts(debouncedSearch || undefined);
    const contacts: Contact[] = data?.items || [];
    const [showCreate, setShowCreate] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

    const fetchContacts = () => mutate();

    return (
        <>
            <ScrollableTableLayout
                header={
                    <>
                        <DashboardControls>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1 min-w-[320px] max-w-xl">
                                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Search contacts..."
                                        className="pl-9 rounded-xl border-border/50"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button className="px-6 shrink-0" onClick={() => setShowCreate(true)}>
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Add Contact
                            </Button>
                        </DashboardControls>
                    </>
                }
            >
                <table className={tableBase + " border-collapse min-w-full"}>
                    <thead className={tableHead + " sticky top-0 z-10"}>
                        <tr>
                            <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Name</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Email</th>
                            <th className={tableHeadCell + " px-4"}>Company</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Job Title</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Status</th>
                            <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right"}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
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
                                        <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8 text-muted-foreground">
                                            <ArrowUpRightIcon className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </ScrollableTableLayout>

            <CreateContactModal
                open={showCreate}
                onOpenChange={setShowCreate}
                onCreated={() => fetchContacts()}
            />

            <ContactSideSheet
                contact={selectedContact}
                open={!!selectedContact}
                onOpenChange={(open) => { if (!open) setSelectedContact(null); }}
            />
        </>
    );
}
