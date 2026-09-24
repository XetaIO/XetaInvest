import type { ReactNode } from 'react';

type Props = {
    title: string;
    description?: string;
    children: ReactNode;
};

export function ChartCard({ title, description, children }: Props) {
    return (
        <section className="flex flex-col rounded-2xl border border-gray-200 p-4 sm:p-6 dark:border-white/10">
            <header className="mb-4">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    {title}
                </h2>
                {description && (
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-white/50">
                        {description}
                    </p>
                )}
            </header>
            {children}
        </section>
    );
}

export function ChartEmpty({
    label,
    className = 'h-64',
}: {
    label: string;
    className?: string;
}) {
    return (
        <div
            className={`flex items-center justify-center text-sm text-gray-500 dark:text-white/50 ${className}`}
        >
            {label}
        </div>
    );
}
