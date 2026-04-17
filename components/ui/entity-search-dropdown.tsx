"use client";

import { useState, useMemo, useCallback, lazy, Suspense } from "react";
import { Input } from "@/components/ui/input";
import { IconPlus as PlusIcon, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const CreateContactModal = lazy(() =>
    import("@/components/modals/CreateContactModal").then(mod => ({ default: mod.CreateContactModal }))
);
const CreateCompanyModal = lazy(() =>
    import("@/components/modals/CreateCompanyModal").then(mod => ({ default: mod.CreateCompanyModal }))
);
const CreateJobModal = lazy(() =>
    import("@/components/modals/CreateJobModal").then(mod => ({ default: mod.CreateJobModal }))
);

export interface EntityOption {
    id: string;
    label: string;
    subtitle?: string | null;
    /** For contacts — auto-cascade company */
    company_id?: string | null;
}

interface EntitySearchDropdownProps {
    /** Current selected entity ID */
    value: string;
    /** Called with new entity ID (or "" to clear) */
    onChange: (id: string, option?: EntityOption) => void;
    /** List of available options */
    options: EntityOption[];
    /** Placeholder text */
    placeholder?: string;
    /** Entity type — enables "Create new" with the matching modal */
    entityType?: "contact" | "company" | "job";
    /** Callback after a new entity is created inline */
    onCreated?: () => void;
    /** Extra class on the wrapper */
    className?: string;
    /** Disable interaction */
    disabled?: boolean;
    /** Show loading state — displays "Loading..." as placeholder */
    loading?: boolean;
}

export function EntitySearchDropdown({
    value,
    onChange,
    options,
    placeholder = "Search...",
    entityType,
    onCreated,
    className,
    disabled,
    loading,
}: EntitySearchDropdownProps) {
    const [search, setSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [showCreate, setShowCreate] = useState(false);

    const selected = useMemo(
        () => options.find(o => o.id === value) ?? null,
        [options, value]
    );

    const filtered = useMemo(() => {
        if (!search) return options;
        const q = search.toLowerCase();
        return options.filter(o =>
            o.label.toLowerCase().includes(q) ||
            o.subtitle?.toLowerCase().includes(q)
        );
    }, [options, search]);

    const handleSelect = useCallback((opt: EntityOption) => {
        onChange(opt.id, opt);
        setSearch("");
        setShowDropdown(false);
    }, [onChange]);

    const handleClear = useCallback(() => {
        onChange("");
        setSearch("");
    }, [onChange]);

    const entityLabel = entityType === "contact" ? "contact" : entityType === "company" ? "company" : "job";

    return (
        <>
            <div className={cn("relative", className)}>
                <Input
                    placeholder={loading ? "Loading..." : placeholder}
                    value={selected ? selected.label : search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        if (value) onChange("");
                        setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    className="rounded-xl"
                    disabled={disabled || loading}
                />
                {showDropdown && !selected && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-background border border-border rounded-xl shadow-lg flex flex-col max-h-56">
                        <div className="overflow-y-auto flex-1 min-h-0">
                            {filtered.length === 0 && !search && (
                                <div className="px-3 py-2 text-sm text-muted-foreground">Type to search</div>
                            )}
                            {filtered.length === 0 && search && (
                                <div className="px-3 py-2 text-sm text-muted-foreground">No results found</div>
                            )}
                            {filtered.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-xl"
                                    onClick={() => handleSelect(opt)}
                                >
                                    <span className="font-medium block">{opt.label}</span>
                                    {opt.subtitle && <span className="text-muted-foreground text-xs block">{opt.subtitle}</span>}
                                </button>
                            ))}
                        </div>
                        {entityType && (
                            <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm text-primary font-medium hover:bg-muted transition-colors flex items-center gap-1.5 border-t border-border rounded-b-xl shrink-0"
                                onClick={() => {
                                    setShowDropdown(false);
                                    setShowCreate(true);
                                }}
                            >
                                <PlusIcon className="w-3.5 h-3.5" />
                                Create new {entityLabel}{search ? `: "${search}"` : ""}
                            </button>
                        )}
                    </div>
                )}
                {selected && (
                    <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                        onClick={handleClear}
                    >
                        <IconX className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {showCreate && entityType === "contact" && (
                <Suspense fallback={null}>
                    <CreateContactModal
                        open={showCreate}
                        onOpenChange={setShowCreate}
                        onCreated={(contact: { id: string; first_name: string; last_name: string; company_id?: string | null }) => {
                            onCreated?.();
                            onChange(contact.id, {
                                id: contact.id,
                                label: `${contact.first_name} ${contact.last_name}`,
                                company_id: contact.company_id,
                            });
                            setSearch("");
                        }}
                    />
                </Suspense>
            )}

            {showCreate && entityType === "company" && (
                <Suspense fallback={null}>
                    <CreateCompanyModal
                        open={showCreate}
                        onOpenChange={setShowCreate}
                        onCreated={(company: { id: string; name: string }) => {
                            onCreated?.();
                            onChange(company.id, { id: company.id, label: company.name });
                            setSearch("");
                        }}
                    />
                </Suspense>
            )}

            {showCreate && entityType === "job" && (
                <Suspense fallback={null}>
                    <CreateJobModal
                        open={showCreate}
                        onOpenChange={setShowCreate}
                        onCreated={(job: Record<string, unknown>) => {
                            onCreated?.();
                            const label = (job.job_title as string) || (job.title as string) || "";
                            onChange(job.id as string, { id: job.id as string, label });
                            setSearch("");
                        }}
                    />
                </Suspense>
            )}
        </>
    );
}
