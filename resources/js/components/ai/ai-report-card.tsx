import { AlertTriangle, Lightbulb, Sparkles, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AiReport } from '@/types/ai';

interface AiReportCardProps {
    report: AiReport | null;
    title?: string;
}

export function AiReportCard({ report, title }: AiReportCardProps) {
    const { i18n, t } = useTranslation();
    const resolvedTitle = title ?? t('ai.daily_analysis');

    if (!report) {
        return (
            <Card className="py-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        {resolvedTitle}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        {t('ai.no_report')}
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (report.status === 'failed') {
        return (
            <Card className="py-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        {resolvedTitle}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            {t('ai.report_failed')} {report.error_message ?? ''}
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    const content = report.content ?? {};
    const summary = typeof content.summary === 'string' ? content.summary : '';
    const highlights = Array.isArray(content.highlights)
        ? content.highlights
        : [];
    const risks = Array.isArray(content.risks) ? content.risks : [];
    const recommendations = Array.isArray(content.recommendations)
        ? content.recommendations
        : [];
    const narrative =
        typeof content.narrative_md === 'string' ? content.narrative_md : '';

    return (
        <Card className="py-6">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        {resolvedTitle}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                        {new Date(report.generated_for_date).toLocaleDateString(
                            i18n.resolvedLanguage === 'en' ? 'en-US' : 'fr-FR',
                        )}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {summary && (
                    <p className="text-sm leading-relaxed">{summary}</p>
                )}

                {highlights.length > 0 && (
                    <div>
                        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                            {t('ai.highlights')}
                        </h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                            {highlights.map((h, i) => (
                                <li key={i} className="flex gap-2">
                                    <span className="text-emerald-500">•</span>
                                    <span>{h}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {risks.length > 0 && (
                    <div>
                        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            {t('ai.risks')}
                        </h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                            {risks.map((r, i) => (
                                <li key={i} className="flex gap-2">
                                    <span className="text-amber-500">•</span>
                                    <span>{r}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {recommendations.length > 0 && (
                    <div>
                        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                            <Lightbulb className="h-3.5 w-3.5 text-sky-500" />
                            {t('ai.recommendations')}
                        </h4>
                        <ul className="space-y-2 text-sm">
                            {recommendations.map((r, i) => (
                                <li
                                    key={i}
                                    className="rounded-md border bg-muted/30 p-2"
                                >
                                    <div className="flex items-center gap-2">
                                        {r.action && (
                                            <Badge
                                                variant="outline"
                                                className="text-xs uppercase"
                                            >
                                                {r.action}
                                            </Badge>
                                        )}
                                        {r.symbol && (
                                            <Badge
                                                variant="secondary"
                                                className="font-mono text-xs"
                                            >
                                                {r.symbol}
                                            </Badge>
                                        )}
                                    </div>
                                    {r.rationale && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {r.rationale}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {narrative && (
                    <details className="rounded-md border bg-muted/20 p-3 text-sm">
                        <summary className="cursor-pointer font-medium">
                            {t('ai.detailed_analysis')}
                        </summary>
                        <div className="prose prose-sm dark:prose-invert mt-2 max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {narrative}
                            </ReactMarkdown>
                        </div>
                    </details>
                )}

                <p className="text-[10px] text-muted-foreground">
                    {t('ai.disclaimer')}
                </p>
            </CardContent>
        </Card>
    );
}
