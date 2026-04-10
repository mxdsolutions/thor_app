/**
 * Shared framer-motion variants used across dashboard pages.
 * Import from here instead of re-declaring `fadeInUp` in every page.
 */

export const fadeInUp = {
    hidden: { y: 12, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.4 } },
};

export const staggerContainer = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
};
