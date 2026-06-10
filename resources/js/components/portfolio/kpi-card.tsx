import { ArrowDown, ArrowUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
    label: string;
    value: string;
    delta?: {
        value: string;
        tone: number;
    };
    secondary?: string;
};

export function KpiCard({ label, value, delta, secondary }: Props) {
    const tone = delta?.tone ?? 0;
    const toneClass =
        tone > 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : tone < 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-muted-foreground';

    return (
        <Card>
            <CardContent className="p-4">
                <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {label}
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                    {value}
                </div>
                {delta && (
                    <div
                        className={cn(
                            'mt-1 flex items-center gap-1 text-sm tabular-nums',
                            toneClass,
                        )}
                    >
                        {tone > 0 ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                        ) : tone < 0 ? (
                            <ArrowDown className="h-3.5 w-3.5" />
                        ) : null}
                        <span>{delta.value}</span>
                    </div>
                )}
                {secondary && (
                    <div className="mt-1 text-xs text-muted-foreground">
                        {secondary}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
