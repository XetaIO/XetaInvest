import { ArrowDown, ArrowUp } from 'lucide-react';
import { deltaToneClass } from '../../../shared/utils/format';
import { cn } from '../../../shared/utils/twMerge';

type Props = {
    label: string;
    value: string;
    delta?: { value: string; tone: number };
    secondary?: string;
};

export function KpiCard({ label, value, delta, secondary }: Props) {
    return (
        <div className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-white/40">
                {label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-800 tabular-nums dark:text-white/90">
                {value}
            </p>
            {delta && (
                <p
                    className={cn(
                        'mt-1 flex items-center gap-1 text-sm tabular-nums',
                        deltaToneClass(delta.tone),
                    )}
                >
                    {delta.tone > 0 && <ArrowUp className="h-3.5 w-3.5" />}
                    {delta.tone < 0 && <ArrowDown className="h-3.5 w-3.5" />}
                    {delta.value}
                </p>
            )}
            {secondary && (
                <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                    {secondary}
                </p>
            )}
        </div>
    );
}
