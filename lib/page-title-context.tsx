"use client";

import { createContext, useContext, useState, useEffect } from "react";

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

    useEffect(() => {
        setTitle(title);
        document.title = `${title} • THOR`;
        return () => {
            setTitle("");
            document.title = "THOR";
        };
    }, [title, setTitle]);
}

export function useCurrentPageTitle() {
    return useContext(PageTitleContext).title;
}
