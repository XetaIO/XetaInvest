import type React from 'react';
import { Link } from 'react-router';

interface DropdownItemProps {
    tag?: 'a' | 'button';
    to?: string;
    onClick?: () => void;
    onItemClick?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    baseClassName?: string;
    className?: string;
    children: React.ReactNode;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
    tag = 'button',
    to,
    onClick,
    onItemClick,
    onMouseEnter,
    onMouseLeave,
    baseClassName = 'block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900',
    className = '',
    children,
}) => {
    const combinedClasses = `${baseClassName} ${className}`.trim();

    const handleClick = (event: React.MouseEvent) => {
        // Only prevent default for buttons without navigation
        if (!to && tag === 'button') {
            event.preventDefault();
        }
        if (onClick) onClick();
        if (onItemClick) onItemClick();
    };

    if (tag === 'a' && to) {
        return (
            <Link
                to={to}
                className={combinedClasses}
                onClick={handleClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                {children}
            </Link>
        );
    }

    // If 'to' is provided but tag is not 'a', still use Link
    if (to) {
        return (
            <Link
                to={to}
                className={combinedClasses}
                onClick={handleClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                {children}
            </Link>
        );
    }

    return (
        <button
            onClick={handleClick}
            className={combinedClasses}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {children}
        </button>
    );
};
