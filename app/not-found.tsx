import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
            <h1 className="text-9xl font-bold text-gray-200 mb-4 font-sans">404</h1>
            <h2 className="text-3xl font-bold text-foreground mb-4 font-sans">Page Not Found</h2>
            <p className="text-muted-foreground mb-8 max-w-md font-sans">
                The page you are looking for doesn&apos;t exist or has been moved.
            </p>
            <Link
                href="/"
                className="px-8 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-900 transition-colors font-sans"
            >
                Go Home
            </Link>
        </div>
    );
}
