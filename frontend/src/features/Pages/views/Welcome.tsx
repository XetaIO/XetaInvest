import {
    ArrowDown,
    BarChart3,
    Calculator,
    ChartCandlestick,
    Globe2,
    WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PageMeta } from '../../../shared/components/common/PageMeta';
import { LandingCta } from '../components/landing-cta';
import {
    AiMockup,
    DashboardMockup,
    PlanningMockup,
    PortfolioMockup,
    SecurityMockup,
    StatisticsMockup,
    WatchlistMockup,
} from '../components/product-mockups';
import { Reveal } from '../components/reveal';
import { useScrollToHash } from '../hooks/useScrollToHash';
import '../styles/landing.css';

interface FeatureSectionProps {
    number: string;
    eyebrow: string;
    title: ReactNode;
    description: string;
    features: string[];
    visual: ReactNode;
    reverse?: boolean;
    id?: string;
}

function FeatureSection({
    number,
    eyebrow,
    title,
    description,
    features,
    visual,
    reverse = false,
    id,
}: FeatureSectionProps) {
    return (
        <section
            id={id}
            className="scroll-mt-24 border-t border-white/5.5 py-24 sm:py-32"
        >
            <div className="mx-auto max-w-7xl px-5 sm:px-8">
                <div
                    className={`grid items-center gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16 ${
                        reverse ? 'lg:grid-cols-[1.18fr_.82fr]' : ''
                    }`}
                >
                    <Reveal className={reverse ? 'lg:order-2' : ''}>
                        <div className="max-w-xl">
                            <div className="font-mono mb-6 flex items-center gap-3 text-[10px] tracking-[0.2em] text-emerald-400 uppercase">
                                <span className="h-px w-8 bg-emerald-400/70" />
                                {number} · {eyebrow}
                            </div>
                            <h2 className="text-4xl leading-[1.03] font-semibold tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">
                                {title}
                            </h2>
                            <p className="mt-6 max-w-lg text-base leading-7 text-white/48 sm:text-lg">
                                {description}
                            </p>
                            <ul className="mt-8 space-y-3">
                                {features.map((feature) => (
                                    <li
                                        key={feature}
                                        className="flex items-center gap-3 text-sm text-white/65"
                                    >
                                        <span className="flex size-5 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/6 text-emerald-400">
                                            <span className="size-1 rounded-full bg-current" />
                                        </span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Reveal>
                    <Reveal
                        delay={120}
                        className={`landing-visual ${reverse ? 'lg:order-1' : ''}`}
                    >
                        {visual}
                    </Reveal>
                </div>
            </div>
        </section>
    );
}

export function Welcome() {
    const { t } = useTranslation();
    useScrollToHash();

    const sections: FeatureSectionProps[] = [
        {
            number: '01',
            eyebrow: t('landing.sections.portfolio.eyebrow'),
            title: (
                <>
                    {t('landing.sections.portfolio.title_start')}{' '}
                    <span className="text-emerald-400">
                        {t('landing.sections.portfolio.title_accent')}
                    </span>
                </>
            ),
            description: t('landing.sections.portfolio.description'),
            features: [
                t('landing.sections.portfolio.feature_1'),
                t('landing.sections.portfolio.feature_2'),
                t('landing.sections.portfolio.feature_3'),
            ],
            visual: <PortfolioMockup />,
        },
        {
            number: '02',
            eyebrow: t('landing.sections.statistics.eyebrow'),
            title: (
                <>
                    {t('landing.sections.statistics.title_start')}{' '}
                    <span className="text-emerald-400">
                        {t('landing.sections.statistics.title_accent')}
                    </span>
                </>
            ),
            description: t('landing.sections.statistics.description'),
            features: [
                t('landing.sections.statistics.feature_1'),
                t('landing.sections.statistics.feature_2'),
                t('landing.sections.statistics.feature_3'),
            ],
            visual: <StatisticsMockup />,
            reverse: true,
        },
        {
            number: '03',
            eyebrow: t('landing.sections.ai.eyebrow'),
            title: (
                <>
                    {t('landing.sections.ai.title_start')}{' '}
                    <span className="text-emerald-400">
                        {t('landing.sections.ai.title_accent')}
                    </span>
                </>
            ),
            description: t('landing.sections.ai.description'),
            features: [
                t('landing.sections.ai.feature_1'),
                t('landing.sections.ai.feature_2'),
                t('landing.sections.ai.feature_3'),
            ],
            visual: <AiMockup />,
            id: 'ai',
        },
        {
            number: '04',
            eyebrow: t('landing.sections.watchlist.eyebrow'),
            title: (
                <>
                    {t('landing.sections.watchlist.title_start')}{' '}
                    <span className="text-emerald-400">
                        {t('landing.sections.watchlist.title_accent')}
                    </span>
                </>
            ),
            description: t('landing.sections.watchlist.description'),
            features: [
                t('landing.sections.watchlist.feature_1'),
                t('landing.sections.watchlist.feature_2'),
                t('landing.sections.watchlist.feature_3'),
            ],
            visual: <WatchlistMockup />,
            reverse: true,
        },
        {
            number: '05',
            eyebrow: t('landing.sections.planning.eyebrow'),
            title: (
                <>
                    {t('landing.sections.planning.title_start')}{' '}
                    <span className="text-emerald-400">
                        {t('landing.sections.planning.title_accent')}
                    </span>
                </>
            ),
            description: t('landing.sections.planning.description'),
            features: [
                t('landing.sections.planning.feature_1'),
                t('landing.sections.planning.feature_2'),
                t('landing.sections.planning.feature_3'),
            ],
            visual: <PlanningMockup />,
            id: 'planning',
        },
        {
            number: '06',
            eyebrow: t('landing.sections.security.eyebrow'),
            title: (
                <>
                    {t('landing.sections.security.title_start')}{' '}
                    <span className="text-emerald-400">
                        {t('landing.sections.security.title_accent')}
                    </span>
                </>
            ),
            description: t('landing.sections.security.description'),
            features: [
                t('landing.sections.security.feature_1'),
                t('landing.sections.security.feature_2'),
                t('landing.sections.security.feature_3'),
            ],
            visual: <SecurityMockup />,
            reverse: true,
            id: 'security',
        },
    ];
    const assets: Array<[string, LucideIcon]> = [
        [t('landing.assets.stocks'), WalletCards],
        [t('landing.assets.etf'), BarChart3],
        [t('landing.assets.crypto'), Globe2],
        [t('landing.assets.indices'), ChartCandlestick],
        [t('landing.assets.currencies'), Calculator],
    ];

    return (
        <>
            <PageMeta
                title={t('landing.meta.title')}
                description={t('landing.meta.description')}
            />

            <main id="top">
                <section className="relative flex min-h-[92vh] items-center overflow-hidden pt-28 pb-20">
                    <div className="landing-hero-grid absolute inset-0 opacity-45" />
                    <div className="landing-orb absolute -top-72 left-1/2 size-192 -translate-x-1/2 rounded-full bg-emerald-400/7.5 blur-[120px]" />
                    <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8">
                        <Reveal className="mx-auto max-w-5xl text-center">
                            <div className="font-mono mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/4.5 px-4 py-2 text-[9px] tracking-[0.18em] text-emerald-300 uppercase">
                                <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                                {t('landing.hero.badge')}
                            </div>
                            <h1 className="text-5xl leading-[0.96] font-semibold tracking-[-0.06em] text-white sm:text-7xl lg:text-[6.6rem]">
                                {t('landing.hero.title_start')}
                                <br />
                                <span className="bg-linear-to-r from-emerald-300 via-emerald-400 to-teal-500 bg-clip-text text-transparent">
                                    {t('landing.hero.title_accent')}
                                </span>
                            </h1>
                            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-white/48 sm:text-lg">
                                {t('landing.hero.description')}
                            </p>
                            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                                <LandingCta />
                                <Link
                                    to={{ pathname: '/', hash: '#features' }}
                                    preventScrollReset
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/2.5 px-6 text-sm font-medium text-white/70 transition hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none"
                                >
                                    {t('landing.cta.discover')}
                                    <ArrowDown className="size-4" />
                                </Link>
                            </div>
                        </Reveal>

                        <Reveal
                            delay={180}
                            className="landing-visual relative mt-16 sm:mt-20"
                        >
                            <div className="absolute inset-x-[15%] -top-8 h-20 bg-emerald-400/10 blur-3xl" />
                            <DashboardMockup />
                        </Reveal>
                    </div>
                </section>

                <section className="border-y border-white/5.5 bg-white/[0.012]">
                    <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/5.5 px-5 sm:grid-cols-5 sm:px-8">
                        {assets.map(([label, AssetIcon], index) => (
                            <Reveal
                                key={label}
                                delay={index * 60}
                                className="last:col-span-2 sm:last:col-span-1"
                            >
                                <div className="flex h-24 items-center justify-center gap-3 text-xs font-medium tracking-wide text-white/40 uppercase">
                                    <AssetIcon className="size-4 text-emerald-400/70" />
                                    {label}
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </section>

                <div id="features" className="scroll-mt-24">
                    {sections.map((section) => (
                        <FeatureSection key={section.number} {...section} />
                    ))}
                </div>

                <section className="relative overflow-hidden border-t border-white/5.5 py-28 sm:py-36">
                    <div className="absolute inset-x-[20%] top-1/2 h-56 -translate-y-1/2 rounded-full bg-emerald-400/[0.07] blur-[100px]" />
                    <Reveal className="relative mx-auto max-w-4xl px-5 text-center sm:px-8">
                        <p className="font-mono text-[10px] tracking-[0.2em] text-emerald-400 uppercase">
                            {t('landing.final.eyebrow')}
                        </p>
                        <h2 className="mt-6 text-4xl leading-tight font-semibold tracking-[-0.045em] text-white sm:text-6xl">
                            {t('landing.final.title')}
                        </h2>
                        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/45">
                            {t('landing.final.description')}
                        </p>
                        <div className="mt-9">
                            <LandingCta />
                        </div>
                    </Reveal>
                </section>
            </main>
        </>
    );
}
