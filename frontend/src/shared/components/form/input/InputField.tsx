import type React from 'react';
import type { FC } from 'react';

interface InputProps {
    type?:
        | 'text'
        | 'number'
        | 'email'
        | 'password'
        | 'date'
        | 'time'
        | 'color'
        // `string & {}` (not plain `string`) keeps literal autocomplete while still accepting any input type.
        | (string & {});
    id?: string;
    name?: string;
    placeholder?: string;
    value?: string | number;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    className?: string;
    min?: string;
    max?: string;
    step?: number;
    disabled?: boolean;
    success?: boolean;
    error?: boolean;
    hint?: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    autoComplete?: string;
    autoFocus?: boolean;
}

export const Input: FC<InputProps> = ({
    type = 'text',
    id,
    name,
    placeholder,
    value,
    onChange,
    onBlur,
    className = '',
    min,
    max,
    step,
    disabled = false,
    success = false,
    error = false,
    hint,
    required = false,
    minLength,
    maxLength,
    autoComplete,
    autoFocus = false,
}) => {
    let inputClasses = `h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 ${className}`;

    if (disabled) {
        inputClasses += ` text-gray-500 border-gray-300 opacity-40 bg-gray-100 cursor-not-allowed dark:bg-neutral-800 dark:text-gray-400 dark:border-white/5 opacity-40`;
    } else if (error) {
        inputClasses += ` border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:text-error-400 dark:border-error-500 dark:focus:border-error-800`;
    } else if (success) {
        inputClasses += ` border-success-500 focus:border-success-300 focus:ring-success-500/20 dark:text-success-400 dark:border-success-500 dark:focus:border-success-800`;
    } else {
        inputClasses += ` text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 placeholder:text-gray-400 dark:bg-mist-950 dark:border-white/5 dark:text-white/90 dark:placeholder:text-white/30  dark:focus:border-brand-800`;
    }

    return (
        <>
            <input
                type={type}
                id={id}
                name={name}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                className={inputClasses}
                required={required}
                minLength={minLength}
                maxLength={maxLength}
                autoComplete={autoComplete}
                autoFocus={autoFocus}
            />

            {hint && (
                <p
                    className={`mt-1.5 text-xs ${
                        error
                            ? 'text-error-500'
                            : success
                              ? 'text-success-500'
                              : 'text-gray-500'
                    }`}
                >
                    {hint}
                </p>
            )}
        </>
    );
};
