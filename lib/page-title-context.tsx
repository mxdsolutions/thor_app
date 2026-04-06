"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useTenantOptional } from "@/lib/tenant-context";

interface PageTitleContextValue {
    title: string;
    setTitle: (title: string) => void;
}

const PageTitleContext = createContext<PageTitleContextValue>({
    title: "",
    setTitle: () => {},
});

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
    const [title, setTitle] = useState("");
    return (
        <PageTitleContext.Provider value={{ title, setTitle }}>
            {children}
        </PageTitleContext.Provider>
    );
}

export function usePageTitle(title: string) {
    const { setTitle } = useContext(PageTitleContext);
    const tenant = useTenantOptional();
    const companyName = tenant?.company_name || tenant?.name;

    useEffect(() => {
        setTitle(title);
        document.title = companyName ? `${title} | ${companyName}` : title;
        return () => { setTitle(""); document.title = companyName || "Dashboard"; };
    }, [title, setTitle, companyName]);
}

export function useCurrentPageTitle() {
    return useContext(PageTitleContext).title;
}
