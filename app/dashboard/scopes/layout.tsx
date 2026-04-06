import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Scopes',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
