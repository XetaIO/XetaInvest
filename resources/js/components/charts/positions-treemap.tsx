import { useTranslation } from 'react-i18next';
import { Tooltip, Treemap, ResponsiveContainer } from 'recharts';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { CHART_COLORS } from '@/lib/constants';
import { formatEur, formatPercent } from '@/lib/format';
import type { InstrumentAllocation } from '@/types/portfolio';

interface TreemapEntry {
    name: string;
    value: number;
    pnl_eur: number;
    pnl_pct: number;
    percent: number;
    [key: string]: unknown;
}

interface CellProps {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    name?: string;
    pnl_eur?: number;
    pnl_pct?: number;
    percent?: number;
    value?: number;
    depth?: number;
}

// Approximate chars that fit in a given pixel width at a given font size (avg char ~0.55× font-size)
function truncate(
    text: string,
    availableWidth: number,
    fontSize: number,
): string {
    const avgCharWidth = fontSize * 0.55;
    const maxChars = Math.floor(availableWidth / avgCharWidth);

    if (maxChars < 2) {
        return '';
    }

    if (text.length <= maxChars) {
        return text;
    }

    return text.slice(0, maxChars - 1) + '…';
}

function TreemapCell({
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    name,
    pnl_eur = 0,
    percent = 0,
    depth = 1,
}: CellProps) {
    // Skip the root node (depth 0) and tiny cells
    if (depth === 0 || width < 10 || height < 10) {
        return null;
    }

    const bgColor =
        pnl_eur > 0
            ? CHART_COLORS.POSITIVE
            : pnl_eur < 0
              ? CHART_COLORS.NEGATIVE
              : CHART_COLORS.NEUTRAL;
    const cx = x + width / 2;
    const cy = y + height / 2;

    const showText = width > 45 && height > 24;
    const showPercent = showText && height > 46;

    const fontSize = Math.min(13, Math.max(8, Math.floor(width / 7)));
    const percentSize = Math.min(11, Math.max(7, Math.floor(width / 9)));

    // Padding inside cell (left + right)
    const padding = 8;
    const availableWidth = width - padding * 2;
    const clipId = `clip-${Math.round(x)}-${Math.round(y)}`;
    const label = truncate(name ?? '', availableWidth, fontSize);

    return (
        <g>
            <defs>
                <clipPath id={clipId}>
                    <rect
                        x={x + 1}
                        y={y + 1}
                        width={width - 2}
                        height={height - 2}
                    />
                </clipPath>
            </defs>
            <rect
                x={x + 1}
                y={y + 1}
                width={width - 2}
                height={height - 2}
                fill={bgColor}
                rx={3}
            />
            {showText && (
                <text
                    x={cx}
                    y={showPercent ? cy - 9 : cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffff"
                    fontSize={fontSize}
                    fontWeight="600"
                    pointerEvents="none"
                    clipPath={`url(#${clipId})`}
                >
                    {label}
                </text>
            )}
            {showPercent && (
                <text
                    x={cx}
                    y={cy + 9}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="rgba(255,255,255,0.85)"
                    fontSize={percentSize}
                    pointerEvents="none"
                    clipPath={`url(#${clipId})`}
                >
                    {percent.toFixed(1)} %
                </text>
            )}
        </g>
    );
}

interface TooltipPayloadItem {
    payload: TreemapEntry;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
    const { t } = useTranslation();

    if (!active || !payload?.length) {
        return null;
    }

    const data = payload[0]?.payload;

    if (!data) {
        return null;
    }

    const isPositive = data.pnl_eur >= 0;

    return (
        <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
            <p className="mb-1 font-semibold">{data.name}</p>
            <p className="text-muted-foreground">
                {t('statistics.col_value')} :{' '}
                <span className="font-medium text-foreground">
                    {formatEur(data.value)}
                </span>
            </p>
            <p className="text-muted-foreground">
                {t('statistics.col_allocation')} :{' '}
                <span className="font-medium text-foreground">
                    {data.percent.toFixed(1)} %
                </span>
            </p>
            <p className="text-muted-foreground">
                {t('statistics.col_pnl')} :{' '}
                <span
                    className={
                        isPositive
                            ? 'font-medium text-emerald-600 dark:text-emerald-400'
                            : 'font-medium text-rose-600 dark:text-rose-400'
                    }
                >
                    {formatEur(data.pnl_eur)} ({formatPercent(data.pnl_pct)})
                </span>
            </p>
        </div>
    );
}

type Props = {
    title: string;
    description?: string;
    data: InstrumentAllocation[];
    emptyLabel?: string;
};

export function PositionsTreemap({
    title,
    description,
    data,
    emptyLabel,
}: Props) {
    const { t } = useTranslation();

    if (data.length === 0) {
        return (
            <Card className="py-6">
                <CardHeader className="pb-0">
                    <CardTitle className="text-base">{title}</CardTitle>
                    {description && (
                        <CardDescription>{description}</CardDescription>
                    )}
                </CardHeader>
                <CardContent className="pb-2">
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                        {emptyLabel ?? t('statistics.no_positions')}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const treemapData: TreemapEntry[] = data.map((item) => ({
        name: item.name ?? item.symbol,
        value: item.value_eur,
        pnl_eur: item.pnl_eur,
        pnl_pct: item.pnl_pct,
        percent: item.percent,
    }));

    return (
        <Card className="py-6">
            <CardHeader className="pb-0">
                <CardTitle className="text-base">{title}</CardTitle>
                {description && (
                    <CardDescription>{description}</CardDescription>
                )}
            </CardHeader>
            <CardContent className="pb-4">
                <ResponsiveContainer width="100%" height={300}>
                    <Treemap
                        data={treemapData}
                        dataKey="value"
                        content={<TreemapCell />}
                        animationDuration={500}
                    >
                        <Tooltip content={<CustomTooltip />} />
                    </Treemap>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
