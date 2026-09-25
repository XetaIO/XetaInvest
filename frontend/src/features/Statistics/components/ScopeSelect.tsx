import { useTranslation } from 'react-i18next';
import type { PortfolioDto } from '../../../bindings/PortfolioDto';
import type { StatisticsScopeParam } from '../api/statistics';
import { parseScopeParam } from '../lib/statistics';

type Props = {
    portfolios: Pick<PortfolioDto, 'id' | 'name' | 'is_default'>[];
    value: StatisticsScopeParam;
    onChange: (scope: StatisticsScopeParam) => void;
};

export function ScopeSelect({ portfolios, value, onChange }: Props) {
    const { t } = useTranslation();
    return (
        <select
            aria-label={t('statistics.select_portfolio')}
            value={String(value)}
            onChange={(event) => onChange(parseScopeParam(event.target.value))}
            className="min-w-60 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-white/10 dark:bg-mist-950 dark:text-white/90"
        >
            <option value="all">{t('statistics.all_portfolios')}</option>
            {portfolios.map((portfolio) => (
                <option key={portfolio.id} value={String(portfolio.id)}>
                    {portfolio.is_default
                        ? `${portfolio.name} ★`
                        : portfolio.name}
                </option>
            ))}
        </select>
    );
}
