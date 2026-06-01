import { Head, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, ExternalLink, Newspaper } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AiReportCard } from '@/components/ai/ai-report-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { NewsProps } from '@/types';

function buildUrl(symbol: string, page: number): string {
    const params = new URLSearchParams();

    if (symbol !== 'all') {
        params.set('symbol', symbol);
    }

    if (page > 1) {
        params.set('page', String(page));
    }

    const qs = params.toString();

    return qs ? `/news?${qs}` : '/news';
}

export default function News({ news, available_symbols, scope, aiNewsReport = null }: NewsProps) {
    const { t } = useTranslation();
    const currentSymbol = scope.symbol ?? 'all';

    const handleSymbolChange = (value: string) => {
        router.visit(buildUrl(value, 1), { preserveScroll: false });
    };

    const goToPage = (page: number) => {
        if (page < 1 || page > news.last_page || page === news.current_page) {
            return;
        }

        router.visit(buildUrl(currentSymbol, page), { preserveScroll: false });
    };

    return (
        <>
            <Head title={t('news.title')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Newspaper className="h-5 w-5 text-muted-foreground" />
                        <h1 className="text-xl font-semibold">{t('news.title')}</h1>
                    </div>
                    <Select value={currentSymbol} onValueChange={handleSymbolChange}>
                        <SelectTrigger className="min-w-50">
                            <SelectValue placeholder={t('news.filter_placeholder')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('news.filter_all')}</SelectItem>
                            {available_symbols.map((s) => (
                                <SelectItem key={s} value={s}>
                                    {s}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <AiReportCard report={aiNewsReport} title="Sélection IA — actualités & screener" />

                {news.data.length === 0 ? (
                    <Card>
                        <CardContent className="p-10 text-center text-muted-foreground">
                            {available_symbols.length === 0
                                ? t('news.no_portfolio')
                                : t('news.no_news')}
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="grid gap-3">
                            {news.data.map((item, index) => (
                                <Card key={`${item.symbol}-${index}-${item.link}`}>
                                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
                                        {item.image && (
                                            <img
                                                src={item.image}
                                                alt=""
                                                loading="lazy"
                                                className="h-24 w-full rounded-md object-cover sm:h-20 sm:w-32"
                                            />
                                        )}
                                        <div className="flex flex-1 flex-col gap-1.5">
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                <Badge variant="secondary">{item.symbol}</Badge>
                                                {item.source && <span>{item.source}</span>}
                                                {item.time && (
                                                    <>
                                                        <span aria-hidden>·</span>
                                                        <span>{item.time}</span>
                                                    </>
                                                )}
                                            </div>
                                            <a
                                                href={item.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group inline-flex items-start gap-1.5 text-sm font-medium text-foreground hover:underline"
                                            >
                                                <span>{item.title}</span>
                                                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-opacity group-hover:opacity-100" />
                                            </a>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                            <p className="text-xs text-muted-foreground">
                                {news.from && news.to
                                    ? t('news.count', { from: news.from, to: news.to, total: news.total })
                                    : t('news.count_simple', { total: news.total })}
                            </p>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => goToPage(news.current_page - 1)}
                                    disabled={news.current_page <= 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    {t('common.previous')}
                                </Button>
                                <span className="px-3 text-sm text-muted-foreground">
                                    {t('news.page_indicator', { current: news.current_page, total: news.last_page })}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => goToPage(news.current_page + 1)}
                                    disabled={news.current_page >= news.last_page}
                                >
                                    {t('common.next')}
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

News.layout = {
    breadcrumbs: [
        {
            title: 'Actualités',
            href: '/news',
        },
    ],
};
