import type React from 'react';
import { useEffect, useRef } from 'react';
import { cn } from '../../../utils/twMerge';

interface DropdownProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
    isOpen,
    onClose,
    children,
    className = '',
}) => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                !(event.target as HTMLElement).closest('.dropdown-toggle')
            ) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={dropdownRef}
            className={cn(
                'absolute z-40 mt-2 rounded-xl border border-gray-200 bg-white shadow-theme-lg lg:right-0 dark:border-white/5 dark:bg-mist-950',
                className,
            )}
        >
            {children}
        </div>
    );
};
