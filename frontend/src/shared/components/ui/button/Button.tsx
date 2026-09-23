import type { ReactNode } from 'react';

interface ButtonProps {
    children: ReactNode; // Button text or content
    size?: 'xs' | 'sm' | 'md' | 'lg'; // Button size
    variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'transparent'; // Button variant
    startIcon?: ReactNode; // Icon before the text
    endIcon?: ReactNode; // Icon after the text
    onClick?: () => void; // Click handler
    disabled?: boolean; // Disabled state
    className?: string; // Additional CSS classes
    type?: 'button' | 'submit' | 'reset'; // Button type
    fullWidth?: boolean; // Full width button
    isLoading?: boolean; // Loading state
}

export const Button: React.FC<ButtonProps> = ({
    children,
    size = 'md',
    variant = 'primary',
    startIcon,
    endIcon,
    onClick,
    className = '',
    disabled = false,
    type = 'button',
    fullWidth = false,
    isLoading = false,
}) => {
    // Size Classes
    const sizeClasses = {
        xs: 'px-3 py-2 text-xs',
        sm: 'px-4 py-3 text-sm',
        md: 'px-5 py-3.5 text-sm',
        lg: 'px-6 py-4 text-base',
    };

    // Variant Classes
    const variantClasses = {
        primary:
            'bg-brand-400 text-black hover:bg-brand-500 focus:ring-brand-300',
        secondary:
            'bg-white text-black hover:bg-neutral-100 dark:hover:bg-white/80 focus:ring-brand-300 border border-neutral-300 dark:border-none',
        outline:
            'bg-white hover:bg-slate-50 border border-slate-300 dark:bg-neutral-950 dark:hover:bg-neutral-800 dark:border-neutral-800 focus:ring-brand-500',
        danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500',
        transparent:
            'bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-900',
    };

    return (
        <button
            className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition hover:cursor-pointer ${
                sizeClasses[size]
            } ${variantClasses[variant]} ${className} ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${fullWidth ? 'w-full' : ''}`}
            onClick={onClick}
            disabled={disabled}
            type={type}
        >
            {startIcon && (
                <span className="flex items-center">{startIcon}</span>
            )}
            {isLoading && (
                <svg
                    className="mr-2 -ml-1 h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            )}
            {children}
            {endIcon && <span className="flex items-center">{endIcon}</span>}
        </button>
    );
};
