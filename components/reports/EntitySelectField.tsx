"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { IconSelector as ChevronUpDownIcon, IconCheck as CheckIcon, IconX as XMarkIcon } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useJobs, useCompanies, useContacts } from "@/lib/swr";
import type { EntityType } from "@/lib/report-templates/types";

interface EntitySelectFieldProps {
    entityType: EntityType;
    value: { id: string; label: string } | null;
    onChange: (value: { id: string; label: string } | null) => void;
    placeholder?: string;
    readOnly?: boolean;
}

type EntityItem = { id: string; label: string; subtitle?: string };

function useEntityItems(entityType: EntityType): { items: EntityItem[]; isLoading: boolean } {
    const jobs = useJobs();
    const companies = useCompanies();
    const contacts = useContacts();

    switch (entityType) {
        case "job":
            return {
                isLoading: jobs.isLoading,
                items: (jobs.data?.items || []).map((j: { id: string; description: string; company?: { name: string } | null }) => ({
                    id: j.id,
                    label: j.description,
                    subtitle: j.company?.name,
                })),
            };
        case "company":
            return {
                isLoading: companies.isLoading,
                items: (companies.data?.items || []).map((c: { id: string; name: string; industry?: string | null }) => ({
                    id: c.id,
                    label: c.name,
                    subtitle: c.industry || undefined,
                })),
            };
        case "contact":
            return {
                isLoading: contacts.isLoading,
                items: (contacts.data?.items || []).map((c: { id: string; first_name: string; last_name: string; company?: { name: string } | null }) => ({
                    id: c.id,
                    label: `${c.first_name} ${c.last_name}`,
                    subtitle: c.company?.name,
                })),
            };
    }
}

export function EntitySelectField({
    entityType,
    value,
    onChange,
    placeholder,
    readOnly,
}: EntitySelectFieldProps) {
    const [open, setOpen] = useState(false);
    const { items, isLoading } = useEntityItems(entityType);

    const displayLabel = value?.label || placeholder || `Select ${entityType}...`;

    if (readOnly) {
        return (
            <div className="flex h-9 w-full items-center rounded-xl border border-input bg-muted/30 px-3 text-sm text-muted-foreground">
                {value?.label || <span className="text-muted-foreground/50">Not selected</span>}
            </div>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <div className="relative">
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            "flex h-9 w-full items-center justify-between rounded-xl border border-input bg-background px-3 text-sm transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            !value && "text-muted-foreground"
                        )}
                    >
                        <span className="truncate">{displayLabel}</span>
                        <ChevronUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </button>
                </PopoverTrigger>
                {value && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange(null);
                        }}
                        className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
            <PopoverContent>
                <Command>
                    <CommandInput placeholder={`Search ${entityType}s...`} />
                    <CommandList>
                        <CommandEmpty>
                            {isLoading ? "Loading..." : `No ${entityType}s found.`}
                        </CommandEmpty>
                        <CommandGroup>
                            {items.map((item) => (
                                <CommandItem
                                    key={item.id}
                                    value={item.label}
                                    onSelect={() => {
                                        onChange({ id: item.id, label: item.label });
                                        setOpen(false);
                                    }}
                                >
                                    <CheckIcon
                                        className={cn(
                                            "mr-2 h-4 w-4 shrink-0",
                                            value?.id === item.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="min-w-0">
                                        <p className="truncate">{item.label}</p>
                                        {item.subtitle && (
                                            <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                                        )}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
