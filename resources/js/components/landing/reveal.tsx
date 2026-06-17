import type { CSSProperties, ReactNode } from 'react';
import { useReveal } from '@/hooks/use-reveal';
import { cn } from '@/lib/utils';

interface RevealProps {
    children: ReactNode;
    className?: string;
    delay?: number;
}

export function Reveal({ children, className, delay = 0 }: RevealProps) {
    const { ref, isVisible } = useReveal();
    const style = {
        '--reveal-delay': `${delay}ms`,
    } as CSSProperties;

    return (
        <div
            ref={ref}
            className={cn('landing-reveal', className)}
            data-visible={isVisible}
            style={style}
        >
            {children}
        </div>
    );
}
