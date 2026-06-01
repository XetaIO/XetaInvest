import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, Sankey, Tooltip, useChartWidth } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BudgetPayload } from '@/types';

type Props = { budget: BudgetPayload };

type SankeyNode = { name: string };
type SankeyLink = { source: number; target: number; value: number };

const eur = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
});

type SankeyTooltipPayload = {
    name?: string;
    value?: number;
    payload?: {
        name?: string;
        value?: number;
        source?: { name?: string };
        target?: { name?: string };
    };
};

function SankeyTooltipContent({
    active,
    payload,
}: {
    active?: boolean;
    payload?: SankeyTooltipPayload[];
}) {
    if (!active || !payload?.length) {
        return null;
    }

    const item = payload[0];
    const data = item.payload;
    const value = eur.format(Number(item.value ?? data?.value ?? 0) || 0);
    const label = data?.source && data?.target
        ? `${data.source.name ?? ''} → ${data.target.name ?? ''}`
        : data?.name ?? item.name ?? '';

    return (
        <div className="border-border/50 bg-background grid min-w-32 items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
            <div className="font-medium">{label}</div>
            <div className="text-muted-foreground">{value}</div>
        </div>
    );
}

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

export function BudgetSankey({ budget }: Props) {
    const { t } = useTranslation();
    const containerWidth = useChartWidth();

    const data = useMemo(() => {
        const nodes: SankeyNode[] = [];
        const links: SankeyLink[] = [];

        const incomeLines = budget.income.lines.filter((l) => (l.amount || 0) > 0);
        const investmentGroups = budget.investments.groups
            .map((g) => ({
                ...g,
                lines: g.lines.filter((l) => (l.amount || 0) > 0),
            }))
            .filter((g) => g.lines.length > 0);
        const expenseGroups = budget.expenses.groups
            .map((g) => ({
                ...g,
                lines: g.lines.filter((l) => (l.amount || 0) > 0),
            }))
            .filter((g) => g.lines.length > 0);

        const totalIncome = incomeLines.reduce((s, l) => s + l.amount, 0);
        const totalInvestments = investmentGroups.reduce(
            (s, g) => s + g.lines.reduce((ss, l) => ss + l.amount, 0),
            0,
        );
        const totalExpenses = expenseGroups.reduce(
            (s, g) => s + g.lines.reduce((ss, l) => ss + l.amount, 0),
            0,
        );

        if (totalIncome === 0) {
            return null;
        }

        const addNode = (name: string): number => {
            nodes.push({ name });

            return nodes.length - 1;
        };

        const budgetNodeIdx = addNode(t('budget.sankey_budget_node'));

        for (const line of incomeLines) {
            const idx = addNode(line.name || t('budget.sankey_income_node'));
            links.push({ source: idx, target: budgetNodeIdx, value: line.amount });
        }

        for (const group of investmentGroups) {
            const groupTotal = group.lines.reduce((s, l) => s + l.amount, 0);

            if (groupTotal === 0) {
                continue;
            }

            const groupIdx = addNode(group.name || t('budget.sankey_investments_node'));
            links.push({ source: budgetNodeIdx, target: groupIdx, value: groupTotal });

            for (const line of group.lines) {
                const lineIdx = addNode(line.name || t('budget.sankey_investments_node'));
                links.push({ source: groupIdx, target: lineIdx, value: line.amount });
            }
        }

        for (const group of expenseGroups) {
            const groupTotal = group.lines.reduce((s, l) => s + l.amount, 0);

            if (groupTotal === 0) {
                continue;
            }

            const groupIdx = addNode(group.name || t('budget.sankey_expenses_node'));
            links.push({ source: budgetNodeIdx, target: groupIdx, value: groupTotal });

            for (const line of group.lines) {
                const lineIdx = addNode(line.name || t('budget.sankey_expenses_node'));
                links.push({ source: groupIdx, target: lineIdx, value: line.amount });
            }
        }

        const remaining = totalIncome - totalInvestments - totalExpenses;

        if (remaining > 0) {
            const idx = addNode(t('budget.sankey_remainder_node'));
            links.push({ source: budgetNodeIdx, target: idx, value: remaining });
        }

        if (links.length === 0) {
            return null;
        }

        return { nodes, links };
    }, [budget, t]);

    return (
        <Card className="py-6">
            <CardHeader>
                <CardTitle>{t('budget.sankey_title')}</CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
                {data ? (
                    <div className="h-105 w-full">
                        <ResponsiveContainer width="100%" height={420}>
                            <Sankey
                                data={data}
                                nodePadding={24}
                                nodeWidth={14}
                                linkCurvature={0.5}
                                iterations={64}
                                margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                                link={{ stroke: '#94a3b8', strokeOpacity: 0.25 }}
                                node={(props: { x: number; y: number; width: number; height: number; index: number; payload: SankeyNode & { sourceLinks?: unknown[]; targetLinks?: unknown[] } }) => {
                                    const { x, y, width, height, index, payload } = props;
                                    const color = COLORS[index % COLORS.length];
                                    const isStart = !payload.targetLinks || payload.targetLinks.length === 0;
                                    const isOut = isStart && x + width + 6 > (containerWidth ?? 0);

                                    return (
                                        <g>
                                            <rect
                                                x={x}
                                                y={y}
                                                width={width}
                                                height={height}
                                                fill={color}
                                                stroke="none"
                                            />
                                            <text
                                                x={isOut ? x - 6 : x + width + 6}
                                                y={y + height / 2}
                                                dy="0.35em"
                                                textAnchor={isOut ? 'end' : 'start'}
                                                fontSize={11}
                                                fill="currentColor"
                                            >
                                                {payload.name}
                                            </text>
                                        </g>
                                    );
                                }}
                            >
                                <Tooltip content={<SankeyTooltipContent />} cursor={false} />
                            </Sankey>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {t('budget.sankey_empty')}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
