import Image from 'next/image';

export function Logo({
    size = 'default',
    width,
    variant = 'light',
    tenantLogoUrl,
    tenantLogoDarkUrl,
}: {
    size?: 'default' | 'large';
    /** Explicit width in px. When set, overrides `size` and renders at this width with auto height. */
    width?: number;
    variant?: 'light' | 'dark';
    tenantLogoUrl?: string | null;
    tenantLogoDarkUrl?: string | null;
}) {
    const baseDimensions = size === 'large' ? { width: 120, height: 48 } : { width: 72, height: 29 };
    const renderWidth = width ?? baseDimensions.width;
    const renderHeight = width
        ? Math.round((width / baseDimensions.width) * baseDimensions.height)
        : baseDimensions.height;

    // Use tenant logo if available, otherwise fall back to the platform default.
    // We ship a single neutral logo at /logo.png — same asset works on light
    // and dark surfaces.
    let src: string;
    if (variant === 'dark') {
        src = tenantLogoDarkUrl || tenantLogoUrl || '/logo.png';
    } else {
        src = tenantLogoUrl || '/logo.png';
    }

    const isExternal = src.startsWith('http');

    return (
        <Image
            src={src}
            alt="Logo"
            width={renderWidth}
            height={renderHeight}
            priority
            className="h-auto object-contain"
            style={{ width: renderWidth, height: 'auto' }}
            {...(isExternal ? { unoptimized: true } : {})}
        />
    );
}
