"use client";

import { useEffect, useState } from "react";

/** True when the primary input is a mouse-like pointer that can hover.
 *  False on touch/pen-only devices (phones, most tablets). Used to switch
 *  the entity preview card from hover-to-open into tap-to-open. */
export function useHoverCapability(): boolean {
    const [hoverCapable, setHoverCapable] = useState(true);

    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return;
        const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
        const update = () => setHoverCapable(mql.matches);
        update();
        mql.addEventListener("change", update);
        return () => mql.removeEventListener("change", update);
    }, []);

    return hoverCapable;
}
