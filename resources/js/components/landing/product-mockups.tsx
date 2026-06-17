import {
    Bot,
    Check,
    Database,
    KeyRound,
    LockKeyhole,
    MessageSquareText,
    ShieldCheck,
    Sparkles,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface MockupFrameProps {
    children: ReactNode;
    className?: string;
}

function MockupFrame({ children, className }: MockupFrameProps) {
    return (
        <div
            className={cn(
                'landing-mockup relative overflow-hidden rounded-xl border border-white/10 bg-[#080c0b] shadow-2xl shadow-black/50',
                className,
            )}
        >
            <div className="flex h-9 items-center gap-1.5 border-b border-white/8 px-4">
                <span className="size-2 rounded-full bg-white/12" />
                <span className="size-2 rounded-full bg-white/12" />
                <span className="size-2 rounded-full bg-emerald-400/60" />
                <span className="ml-auto font-mono text-[9px] tracking-[0.2em] text-white/25">
                    XETAINVEST
                </span>
            </div>
            {children}
        </div>
    );
}

const positions = [
    ['CW8.PA', 'Amundi MSCI World', '12 840,20 €', '+8,42%'],
    ['ESE.PA', 'BNP S&P 500', '7 216,80 €', '+5,18%'],
    ['BTC-EUR', 'Bitcoin', '3 482,10 €', '-1,26%'],
];

export function DashboardMockup() {
    const { t } = useTranslation();

    return (
        <MockupFrame className="mx-auto max-w-6xl">
            <div className="grid min-h-[410px] grid-cols-1 md:grid-cols-[170px_1fr]">
                <aside className="hidden border-r border-white/8 bg-white/[0.015] p-4 md:block">
                    <img
                        src="/images/logo-brand-dark-mode.png"
                        alt="XetaInvest"
                        className="mb-8 h-7 w-auto"
                    />
                    {['dashboard', 'statistics', 'budget', 'watchlist'].map(
                        (item, index) => (
                            <div
                                key={item}
                                className={cn(
                                    'mb-2 rounded-md px-3 py-2 text-[11px]',
                                    index === 0
                                        ? 'bg-white/8 text-white'
                                        : 'text-white/40',
                                )}
                            >
                                {t(`nav.${item}`)}
                            </div>
                        ),
                    )}
                </aside>
                <div className="p-4 sm:p-6">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-white/35">
                                {t('landing.mockup.portfolio')}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-white">
                                {t('landing.mockup.long_term')}
                            </p>
                        </div>
                        <span className="rounded-full border border-emerald-400/25 bg-emerald-400/8 px-3 py-1 text-[10px] text-emerald-300">
                            {t('landing.mockup.live')}
                        </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            [t('dashboard.current_value'), '23 539,10 €'],
                            [t('dashboard.invested_label'), '21 480,00 €'],
                            [t('statistics.pnl'), '+2 059,10 €'],
                            [t('dashboard.daily_change'), '+184,32 €'],
                        ].map(([label, value], index) => (
                            <div
                                key={label}
                                className="landing-metric rounded-lg border border-white/8 bg-black/20 p-4"
                                style={
                                    { '--metric-index': index } as CSSProperties
                                }
                            >
                                <p className="text-[9px] tracking-wider text-white/35 uppercase">
                                    {label}
                                </p>
                                <p className="mt-2 text-lg font-semibold text-white">
                                    {value}
                                </p>
                                {index > 1 && (
                                    <p className="mt-1 text-[10px] text-emerald-400">
                                        ↑ +4,37%
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 overflow-hidden rounded-lg border border-white/8">
                        {positions.map(([symbol, name, value, change]) => (
                            <div
                                key={symbol}
                                className="grid grid-cols-[70px_1fr_auto] items-center gap-3 border-b border-white/6 px-4 py-3 last:border-0"
                            >
                                <span className="font-mono text-[11px] text-emerald-300">
                                    {symbol}
                                </span>
                                <span className="truncate text-xs text-white/65">
                                    {name}
                                </span>
                                <div className="text-right">
                                    <p className="text-xs text-white">
                                        {value}
                                    </p>
                                    <p
                                        className={cn(
                                            'text-[10px]',
                                            change.startsWith('+')
                                                ? 'text-emerald-400'
                                                : 'text-rose-400',
                                        )}
                                    >
                                        {change}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </MockupFrame>
    );
}

export function PortfolioMockup() {
    const { t } = useTranslation();

    return (
        <MockupFrame>
            <div className="p-5 sm:p-7">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="font-mono text-[9px] tracking-[0.18em] text-emerald-400 uppercase">
                            {t('landing.mockup.transactions')}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-white">
                            {t('landing.mockup.complete_history')}
                        </h3>
                    </div>
                    <span className="rounded border border-white/10 px-3 py-1.5 text-[10px] text-white/45">
                        EUR · USD · GBP
                    </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                    {[
                        [t('landing.mockup.buy'), 'CW8.PA', '2 150,00 €'],
                        [t('landing.mockup.dividend'), 'MSFT', '+42,18 €'],
                        [t('landing.mockup.sell'), 'AIR.PA', '+318,40 €'],
                    ].map(([type, symbol, amount], index) => (
                        <div
                            key={`${type}-${symbol}`}
                            className="rounded-lg border border-white/8 bg-white/[0.02] p-4"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] text-white/35 uppercase">
                                    {type}
                                </span>
                                {index === 0 ? (
                                    <TrendingUp className="size-3.5 text-emerald-400" />
                                ) : index === 1 ? (
                                    <Sparkles className="size-3.5 text-amber-300" />
                                ) : (
                                    <TrendingDown className="size-3.5 text-sky-300" />
                                )}
                            </div>
                            <p className="mt-4 font-mono text-sm text-white">
                                {symbol}
                            </p>
                            <p className="mt-1 text-xs text-white/45">
                                {amount}
                            </p>
                        </div>
                    ))}
                </div>
                <div className="mt-5 rounded-lg border border-white/8">
                    {[
                        ['12/06/2026', 'CW8.PA', '4', '537,50 €'],
                        ['04/06/2026', 'MSFT', '0,12', '351,50 $'],
                        ['18/05/2026', 'AIR.PA', '3', '164,20 €'],
                    ].map((row) => (
                        <div
                            key={row.join('-')}
                            className="grid grid-cols-4 gap-3 border-b border-white/6 px-4 py-3 font-mono text-[10px] last:border-0"
                        >
                            <span className="text-white/35">{row[0]}</span>
                            <span className="text-emerald-300">{row[1]}</span>
                            <span className="text-right text-white/55">
                                {row[2]}
                            </span>
                            <span className="text-right text-white">
                                {row[3]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </MockupFrame>
    );
}

export function StatisticsMockup() {
    const { t } = useTranslation();

    return (
        <MockupFrame>
            <div className="p-5 sm:p-7">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-white/35">
                            {t('landing.mockup.portfolio_value')}
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-white">
                            23 539,10 €
                        </p>
                    </div>
                    <p className="text-sm text-emerald-400">+9,59%</p>
                </div>
                <div className="mt-6 rounded-lg border border-white/8 bg-black/20 p-4">
                    <svg
                        viewBox="0 0 640 220"
                        className="h-48 w-full"
                        role="img"
                        aria-label={t('landing.mockup.performance_chart')}
                    >
                        <defs>
                            <linearGradient
                                id="landing-area"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="0%"
                                    stopColor="#34d399"
                                    stopOpacity="0.32"
                                />
                                <stop
                                    offset="100%"
                                    stopColor="#34d399"
                                    stopOpacity="0"
                                />
                            </linearGradient>
                        </defs>
                        {[40, 90, 140, 190].map((y) => (
                            <line
                                key={y}
                                x1="0"
                                x2="640"
                                y1={y}
                                y2={y}
                                stroke="rgba(255,255,255,.06)"
                            />
                        ))}
                        <path
                            d="M0 183 C45 178 65 158 105 164 S170 132 210 141 S275 105 315 118 S380 88 420 95 S490 61 530 72 S590 31 640 38 L640 220 L0 220 Z"
                            fill="url(#landing-area)"
                        />
                        <path
                            className="landing-chart-path"
                            d="M0 183 C45 178 65 158 105 164 S170 132 210 141 S275 105 315 118 S380 88 420 95 S490 61 530 72 S590 31 640 38"
                            fill="none"
                            stroke="#34d399"
                            strokeWidth="3"
                            strokeLinecap="round"
                            pathLength="1"
                        />
                    </svg>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {[
                        ['ETF', '58%', 'bg-emerald-400'],
                        [t('landing.mockup.stocks'), '29%', 'bg-sky-400'],
                        ['Crypto', '13%', 'bg-violet-400'],
                    ].map(([label, value, color]) => (
                        <div
                            key={label}
                            className="rounded-lg border border-white/8 px-4 py-3"
                        >
                            <div className="flex items-center gap-2 text-[10px] text-white/45">
                                <span
                                    className={cn(
                                        'size-1.5 rounded-full',
                                        color,
                                    )}
                                />
                                {label}
                            </div>
                            <p className="mt-2 text-lg font-semibold text-white">
                                {value}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </MockupFrame>
    );
}

export function AiMockup() {
    const { t } = useTranslation();

    return (
        <MockupFrame>
            <div className="grid min-h-[430px] md:grid-cols-[160px_1fr]">
                <div className="hidden border-r border-white/8 p-4 md:block">
                    <div className="mb-4 flex items-center gap-2 text-xs text-white">
                        <Bot className="size-4 text-emerald-400" />
                        {t('landing.mockup.assistant')}
                    </div>
                    {[1, 2, 3].map((item) => (
                        <div
                            key={item}
                            className={cn(
                                'mb-2 h-9 rounded-md',
                                item === 1 ? 'bg-white/8' : 'bg-white/[0.025]',
                            )}
                        />
                    ))}
                </div>
                <div className="flex flex-col p-4 sm:p-6">
                    <div className="max-w-[82%] self-end rounded-xl rounded-br-sm bg-white px-4 py-3 text-xs leading-relaxed text-[#07100d]">
                        {t('landing.mockup.ai_question')}
                    </div>
                    <div className="mt-4 max-w-[92%] rounded-xl rounded-bl-sm border border-emerald-400/15 bg-emerald-400/[0.055] p-4">
                        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-emerald-300">
                            <Sparkles className="size-3.5" />
                            XetaInvest AI
                        </div>
                        <p className="text-xs leading-relaxed text-white/65">
                            {t('landing.mockup.ai_answer')}
                        </p>
                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                            {[
                                ['P&L', '+9,59%'],
                                [
                                    t('landing.mockup.risk'),
                                    t('landing.mockup.moderate'),
                                ],
                                [
                                    t('landing.mockup.diversification'),
                                    '7,8 / 10',
                                ],
                            ].map(([label, value]) => (
                                <div
                                    key={label}
                                    className="rounded-md border border-white/8 bg-black/20 p-3"
                                >
                                    <p className="text-[9px] text-white/35 uppercase">
                                        {label}
                                    </p>
                                    <p className="mt-1 text-xs text-white">
                                        {value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="mt-auto flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/30">
                        <MessageSquareText className="size-4" />
                        {t('landing.mockup.ask_question')}
                    </div>
                </div>
            </div>
        </MockupFrame>
    );
}

const candles: Array<[number, number, boolean]> = [
    [58, 24, true],
    [48, 34, true],
    [62, 28, false],
    [42, 38, true],
    [72, 30, true],
    [54, 42, false],
    [82, 34, true],
    [64, 48, true],
    [88, 40, false],
    [70, 52, true],
    [96, 42, true],
    [78, 58, false],
    [104, 48, true],
    [92, 62, true],
    [116, 54, true],
    [98, 70, false],
    [124, 62, true],
    [108, 78, false],
    [132, 68, true],
    [118, 84, true],
];

export function WatchlistMockup() {
    const { t } = useTranslation();

    return (
        <MockupFrame>
            <div className="grid min-h-[440px] lg:grid-cols-[1fr_250px]">
                <div className="border-b border-white/8 p-5 lg:border-r lg:border-b-0">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-white/35">
                                {t('landing.mockup.advanced_chart')}
                            </p>
                            <p className="mt-1 font-mono text-sm text-white">
                                ^NDX · NASDAQ 100
                            </p>
                        </div>
                        <span className="text-xs text-emerald-400">+8,27%</span>
                    </div>
                    <div className="landing-candles relative flex h-72 items-end gap-1 overflow-hidden rounded-lg border border-white/8 bg-black/20 px-4 pb-8">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
                        {candles.map(([height, offset, up], index) => (
                            <span
                                key={`${height}-${offset}-${index}`}
                                className={cn(
                                    'landing-candle relative z-10 w-full max-w-3 rounded-sm',
                                    up ? 'bg-emerald-400' : 'bg-rose-400',
                                )}
                                style={
                                    {
                                        height,
                                        marginBottom: offset,
                                        '--candle-index': index,
                                    } as CSSProperties
                                }
                            >
                                <span
                                    className={cn(
                                        'absolute top-[-10px] bottom-[-10px] left-1/2 w-px -translate-x-1/2',
                                        up ? 'bg-emerald-400' : 'bg-rose-400',
                                    )}
                                />
                            </span>
                        ))}
                    </div>
                </div>
                <div className="p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">
                            {t('landing.mockup.watchlist')}
                        </p>
                        <span className="text-[10px] text-white/30">
                            6 / 25
                        </span>
                    </div>
                    {[
                        ['NVDA', '205,19 $', '+1,84%'],
                        ['MSFT', '390,74 $', '+0,62%'],
                        ['AIR.PA', '164,20 €', '+2,17%'],
                        ['BTC-EUR', '91 842 €', '-0,73%'],
                        ['CW8.PA', '537,50 €', '+0,41%'],
                    ].map(([symbol, price, change]) => (
                        <div
                            key={symbol}
                            className="grid grid-cols-[1fr_auto] gap-3 border-b border-white/7 py-3 last:border-0"
                        >
                            <div>
                                <p className="font-mono text-xs text-white">
                                    {symbol}
                                </p>
                                <p className="mt-1 text-[9px] text-white/30">
                                    {price}
                                </p>
                            </div>
                            <p
                                className={cn(
                                    'text-xs',
                                    change.startsWith('+')
                                        ? 'text-emerald-400'
                                        : 'text-rose-400',
                                )}
                            >
                                {change}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </MockupFrame>
    );
}

export function PlanningMockup() {
    const { t } = useTranslation();

    return (
        <MockupFrame>
            <div className="grid gap-4 p-5 sm:p-7 lg:grid-cols-2">
                <div className="rounded-lg border border-white/8 bg-black/20 p-5">
                    <p className="text-xs font-semibold text-white">
                        {t('landing.mockup.monthly_budget')}
                    </p>
                    <div className="mt-6 space-y-5">
                        {[
                            [
                                t('budget.income'),
                                '4 200 €',
                                'w-full',
                                'bg-emerald-400',
                            ],
                            [
                                t('budget.expenses'),
                                '2 480 €',
                                'w-[59%]',
                                'bg-rose-400',
                            ],
                            [
                                t('budget.investments'),
                                '920 €',
                                'w-[22%]',
                                'bg-sky-400',
                            ],
                        ].map(([label, value, width, color]) => (
                            <div key={label}>
                                <div className="mb-2 flex justify-between text-[10px]">
                                    <span className="text-white/40">
                                        {label}
                                    </span>
                                    <span className="text-white">{value}</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
                                    <div
                                        className={cn(
                                            'landing-budget-bar h-full rounded-full',
                                            width,
                                            color,
                                        )}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-7 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.05] p-4">
                        <p className="text-[9px] text-emerald-300 uppercase">
                            {t('budget.remaining_label')}
                        </p>
                        <p className="mt-2 text-xl font-semibold text-white">
                            800 €
                        </p>
                    </div>
                </div>
                <div className="rounded-lg border border-white/8 bg-black/20 p-5">
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-xs font-semibold text-white">
                                {t('landing.mockup.projection')}
                            </p>
                            <p className="mt-1 text-[10px] text-white/35">
                                20 {t('calculator.years_unit').toLowerCase()}
                            </p>
                        </div>
                        <p className="text-lg font-semibold text-emerald-400">
                            184 320 €
                        </p>
                    </div>
                    <svg
                        viewBox="0 0 420 240"
                        className="mt-6 h-56 w-full"
                        role="img"
                        aria-label={t('landing.mockup.projection_chart')}
                    >
                        {[45, 100, 155, 210].map((y) => (
                            <line
                                key={y}
                                x1="0"
                                x2="420"
                                y1={y}
                                y2={y}
                                stroke="rgba(255,255,255,.06)"
                            />
                        ))}
                        <path
                            className="landing-chart-path landing-chart-path-secondary"
                            d="M0 218 C75 210 115 198 155 179 S235 143 275 116 S350 58 420 22"
                            fill="none"
                            stroke="#34d399"
                            strokeWidth="3"
                            strokeLinecap="round"
                            pathLength="1"
                        />
                        <path
                            className="landing-chart-path"
                            d="M0 218 C80 215 120 207 165 196 S245 172 290 151 S355 111 420 76"
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="2"
                            strokeLinecap="round"
                            pathLength="1"
                        />
                    </svg>
                </div>
            </div>
        </MockupFrame>
    );
}

export function SecurityMockup() {
    const { t } = useTranslation();
    const securityItems: Array<[LucideIcon, string, string]> = [
        [ShieldCheck, '2FA', t('landing.mockup.enabled')],
        [KeyRound, 'Passkeys', 'WebAuthn'],
        [LockKeyhole, t('landing.mockup.policies'), t('landing.mockup.active')],
        [Database, 'PostgreSQL', t('landing.mockup.your_instance')],
    ];

    return (
        <MockupFrame>
            <div className="grid gap-4 p-5 sm:p-7 lg:grid-cols-[1.15fr_.85fr]">
                <div className="rounded-lg border border-white/8 bg-black/30 p-5 font-mono text-[10px]">
                    <div className="mb-5 flex items-center gap-2 text-white/35">
                        <Database className="size-3.5 text-emerald-400" />
                        xetainvest@server
                    </div>
                    {[
                        [
                            '$ php artisan migrate --force',
                            t('landing.mockup.migrations_done'),
                        ],
                        ['$ npm run build', t('landing.mockup.assets_built')],
                        [
                            '$ php artisan queue:work',
                            t('landing.mockup.queue_active'),
                        ],
                        ['$ curl https://xeta.local/up', 'HTTP 200 · OK'],
                    ].map(([command, result]) => (
                        <div key={command} className="mb-4">
                            <p className="text-white/65">{command}</p>
                            <p className="mt-1 text-emerald-400">✓ {result}</p>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {securityItems.map(([SecurityIcon, title, subtitle]) => (
                        <div
                            key={title}
                            className="flex min-h-32 flex-col justify-between rounded-lg border border-white/8 bg-white/[0.02] p-4"
                        >
                            <SecurityIcon className="size-5 text-emerald-400" />
                            <div>
                                <p className="text-xs font-semibold text-white">
                                    {title}
                                </p>
                                <p className="mt-1 text-[9px] text-white/35">
                                    {subtitle}
                                </p>
                            </div>
                            <Check className="ml-auto size-3 text-emerald-400" />
                        </div>
                    ))}
                </div>
            </div>
        </MockupFrame>
    );
}
