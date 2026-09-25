import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';
import type { InstrumentAllocation } from '../../../bindings/InstrumentAllocation';
import { formatEur, formatPercent } from '../../../shared/utils/format';
import { cn } from '../../../shared/utils/twMerge';
import { ChartCard, ChartEmpty } from './ChartCard';

type Tile = {
    name: string;
    value: number;
    pnl_eur: number;
    pnl_pct: number;
    percent: number;
};

type CellProps = Partial<Tile> & {
    x: number;
    y: number;
    width: number;
    height: number;
    depth: number;
};

function tileColor(pnl: number): string {
    if (pnl > 0) {
        return '#10b981';
    }
    return pnl < 0 ? '#ef4444' : '#6b7280';
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function truncate(text: string, width: number, fontSize: number): string {
    const maxChars = Math.floor((width - 16) / (fontSize * 0.55));
    return text.length > maxChars
        ? `${text.slice(0, Math.max(1, maxChars - 1))}…`
        : text;
}

function TreemapCell({
    x,
    y,
    width,
    height,
    depth,
    name,
    pnl_eur,
    percent,
}: CellProps) {
    if (depth === 0 || width < 10 || height < 10) {
        return <g />;
    }
    const nameSize = clamp(Math.floor(width / 7), 8, 13);
    const percentSize = clamp(Math.floor(width / 9), 7, 11);
    const showName = width > 45 && height > 24;
    return (
        <g>
            <rect
                x={x + 1}
                y={y + 1}
                width={width - 2}
                height={height - 2}
                rx={3}
                fill={tileColor(pnl_eur ?? 0)}
            />
            {showName && (
                <text
                    x={x + 8}
                    y={y + 8 + nameSize}
                    fill="#fff"
                    fontSize={nameSize}
                    fontWeight={600}
                >
                    {truncate(name ?? '', width, nameSize)}
                </text>
            )}
            {showName && height > 46 && (
                <text
                    x={x + 8}
                    y={y + 12 + nameSize + percentSize}
                    fill="rgba(255,255,255,0.85)"
                    fontSize={percentSize}
                >
                    {`${(percent ?? 0).toFixed(1)} %`}
                </text>
            )}
        </g>
    );
}

type Props = { rows: InstrumentAllocation[] };

export function PositionsTreemap({ rows }: Props) {
    const { t } = useTranslation();
    const tiles: Tile[] = rows.map((row) => ({
        name: row.name || row.symbol,
        value: row.value_eur,
        pnl_eur: row.pnl_eur,
        pnl_pct: row.pnl_pct,
        percent: row.percent,
    }));

    return (
        <ChartCard
            title={t('statistics.treemap_title')}
            description={t('statistics.treemap_desc')}
        >
            {tiles.length === 0 ? (
                <ChartEmpty
                    label={t('statistics.no_positions')}
                    className="h-48"
                />
            ) : (
                <div className="h-75 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <Treemap
                            data={tiles}
                            dataKey="value"
                            animationDuration={500}
                            content={(props) => (
                                <TreemapCell
                                    {...(props as unknown as CellProps)}
                                />
                            )}
                        >
                            <Tooltip
                                content={({ active, payload }) => {
                                    const tile = payload?.[0]?.payload as
                                        Tile | undefined;
                                    if (!active || !tile) {
                                        return null;
                                    }
                                    return (
                                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-md dark:border-white/10 dark:bg-neutral-900">
                                            <div className="font-semibold text-gray-900 dark:text-white">
                                                {tile.name}
                                            </div>
                                            <div className="text-gray-600 dark:text-white/70">
                                                {t('statistics.col_value')} :{' '}
                                                {formatEur(tile.value)}
                                            </div>
                                            <div className="text-gray-600 dark:text-white/70">
                                                {t('statistics.col_allocation')}{' '}
                                                : {tile.percent.toFixed(1)} %
                                            </div>
                                            <div
                                                className={cn(
                                                    tile.pnl_eur >= 0
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-rose-600 dark:text-rose-400',
                                                )}
                                            >
                                                {t('statistics.col_pnl')} :{' '}
                                                {formatEur(tile.pnl_eur)} (
                                                {formatPercent(tile.pnl_pct)})
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                        </Treemap>
                    </ResponsiveContainer>
                </div>
            )}
        </ChartCard>
    );
}
