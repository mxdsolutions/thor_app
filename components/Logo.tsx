import React from 'react';
import Image from 'next/image';

export function Logo({ size = 'default', variant = 'light' }: { size?: 'default' | 'large'; variant?: 'light' | 'dark' }) {
    const dimensions = size === 'large' ? { width: 120, height: 48 } : { width: 80, height: 32 };
    const src = variant === 'dark' ? '/logo_dark.png' : '/logo_light.png';

    return (
        <Image
            src={src}
            alt="MXD"
            width={dimensions.width}
            height={dimensions.height}
            priority
            className="h-auto object-contain"
            style={{ width: dimensions.width, height: 'auto' }}
        />
    );
}
