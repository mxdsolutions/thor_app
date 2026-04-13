import Image from 'next/image';

export function Logo({
    size = 'default',
    variant = 'light',
    tenantLogoUrl,
    tenantLogoDarkUrl,
}: {
    size?: 'default' | 'large';
    variant?: 'light' | 'dark';
    tenantLogoUrl?: string | null;
    tenantLogoDarkUrl?: string | null;
}) {
    const dimensions = size === 'large' ? { width: 120, height: 48 } : { width: 72, height: 29 };

    // Use tenant logo if available, otherwise fall back to default
    let src: string;
    if (variant === 'dark') {
        src = tenantLogoDarkUrl || tenantLogoUrl || '/logo_dark.png';
    } else {
        src = tenantLogoUrl || '/logo_light.png';
    }

    const isExternal = src.startsWith('http');

    return (
        <Image
            src={src}
            alt="Logo"
            width={dimensions.width}
            height={dimensions.height}
            priority
            className="h-auto object-contain"
            style={{ width: dimensions.width, height: 'auto' }}
            {...(isExternal ? { unoptimized: true } : {})}
        />
    );
}
