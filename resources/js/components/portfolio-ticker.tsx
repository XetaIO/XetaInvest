import { Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Area, AreaChart } from 'recharts';
import { CHART_COLORS } from '@/lib/constants';
import { formatSignedNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { show as symbolShow } from '@/routes/symbol';
import type { PortfolioTickerEntry } from '@/types/ticker';

function TickerItem({ entry }: { entry: PortfolioTickerEntry }) {
    const { i18n } = useTranslation();
    const loc = i18n.resolvedLanguage ?? 'fr';
    const formatPrice = (value: number, currency: string): string => {
        try {
            return new Intl.NumberFormat(loc, {
                style: 'currency',
                currency,
                maximumFractionDigits: value >= 100 ? 2 : 4,
            }).format(value);
        } catch {
            return value.toFixed(2);
        }
    };
    const isUp = entry.change >= 0;
    const colorClass = isUp ? 'text-emerald-500' : 'text-red-500';

    const base = entry.sparkline[0] ?? 0;
    const data = entry.sparkline.map((value, index) => ({
        index,
        value: value - base,
    }));
    const values = data.map((d) => d.value);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);
    const range = max - min || 1;
    const gradientOffset = max / range;
    const gradientId = `ticker-gradient-${entry.symbol.replace(/[^a-zA-Z0-9]/g, '_')}`;

    return (
        <Link
            href={symbolShow(entry.symbol).url}
            className="group flex shrink-0 items-center gap-3 border-r border-border/40 px-5 py-2 transition-colors hover:bg-accent/50"
        >
            <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold group-hover:underline">
                    {entry.name.length > 20
                        ? `${entry.name.slice(0, 20)}...`
                        : entry.name}
                </span>
                <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
                    {entry.symbol}
                </span>
            </div>

            <span className="text-sm font-medium tabular-nums">
                {formatPrice(entry.price, entry.currency)}
            </span>

            <div className="h-6 w-16 shrink-0">
                <AreaChart width={64} height={24} data={data}>
                    <defs>
                        <linearGradient
                            id={gradientId}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="0"
                                stopColor={CHART_COLORS.POSITIVE}
                                stopOpacity={0.6}
                            />
                            <stop
                                offset={gradientOffset}
                                stopColor={CHART_COLORS.POSITIVE}
                                stopOpacity={0.1}
                            />
                            <stop
                                offset={gradientOffset}
                                stopColor={CHART_COLORS.NEGATIVE}
                                stopOpacity={0.1}
                            />
                            <stop
                                offset="1"
                                stopColor={CHART_COLORS.NEGATIVE}
                                stopOpacity={0.6}
                            />
                        </linearGradient>
                        <linearGradient
                            id={`${gradientId}-stroke`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="0"
                                stopColor={CHART_COLORS.POSITIVE}
                            />
                            <stop
                                offset={gradientOffset}
                                stopColor={CHART_COLORS.POSITIVE}
                            />
                            <stop
                                offset={gradientOffset}
                                stopColor={CHART_COLORS.NEGATIVE}
                            />
                            <stop
                                offset="1"
                                stopColor={CHART_COLORS.NEGATIVE}
                            />
                        </linearGradient>
                    </defs>
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={`url(#${gradientId}-stroke)`}
                        strokeWidth={1.5}
                        fill={`url(#${gradientId})`}
                        baseValue={0}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </div>

            <div
                className={cn(
                    'flex flex-col text-right leading-tight tabular-nums',
                    colorClass,
                )}
            >
                <span className="text-xs font-medium">
                    {formatSignedNumber(entry.change)}
                </span>
                <span className="text-[11px]">
                    {formatSignedNumber(entry.change_percent)}&nbsp;%
                </span>
            </div>
        </Link>
    );
}

export function PortfolioTicker() {
    const { portfolioTicker } = usePage().props as {
        portfolioTicker?: PortfolioTickerEntry[] | null;
    };

    if (!portfolioTicker || portfolioTicker.length === 0) {
        return null;
    }

    return (
        <div className="ticker-wrapper relative w-full overflow-hidden border-b bg-muted/30">
            <div className="ticker-track animate-ticker flex w-max">
                {[0, 1].map((copy) => (
                    <div
                        key={copy}
                        className="flex shrink-0"
                        aria-hidden={copy === 1}
                    >
                        {portfolioTicker.map((entry) => (
                            <TickerItem
                                key={`${copy}-${entry.symbol}`}
                                entry={entry}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
