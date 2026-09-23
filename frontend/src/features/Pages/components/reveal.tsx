import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../../shared/utils/twMerge';
import { useReveal } from '../hooks/useReveal';

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
