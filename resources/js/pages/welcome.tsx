import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowDown,
    BarChart3,
    Calculator,
    ChartCandlestick,
    Github,
    Globe2,
    Languages,
    Menu,
    WalletCards,
    X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LandingCta } from '@/components/landing/landing-cta';
import {
    AiMockup,
    DashboardMockup,
    PlanningMockup,
    PortfolioMockup,
    SecurityMockup,
    StatisticsMockup,
    WatchlistMockup,
} from '@/components/landing/product-mockups';
import { Reveal } from '@/components/landing/reveal';
import { useLocale } from '@/hooks/use-locale';
import { login } from '@/routes';
import { update as updateLocale } from '@/routes/locale';
import type { SharedData } from '@/types/shared';

type Locale = 'fr' | 'en';

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
                            <div className="mb-6 flex items-center gap-3 font-mono text-[10px] tracking-[0.2em] text-emerald-400 uppercase">
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

function LanguageToggle() {
    const { t, i18n } = useTranslation();
    const activeLocale = i18n.resolvedLanguage === 'en' ? 'en' : 'fr';

    const changeLocale = (locale: Locale) => {
        if (locale === activeLocale) {
            return;
        }

        void i18n.changeLanguage(locale);
        router.patch(
            updateLocale().url,
            { locale },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    return (
        <div
            className="flex items-center rounded-full border border-white/10 bg-white/[0.035] p-1"
            aria-label={t('language_switcher.label')}
        >
            <Languages className="mx-1.5 size-3.5 text-white/35" />
            {(['fr', 'en'] as const).map((locale) => (
                <button
                    key={locale}
                    type="button"
                    onClick={() => changeLocale(locale)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase transition focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none ${
                        activeLocale === locale
                            ? 'bg-emerald-400 text-[#03110c]'
                            : 'text-white/45 hover:cursor-pointer hover:text-white'
                    }`}
                    aria-pressed={activeLocale === locale}
                >
                    {locale}
                </button>
            ))}
        </div>
    );
}

export default function Welcome() {
    useLocale();
    const { t } = useTranslation();
    const { registrationEnabled } = usePage<SharedData>().props;
    const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

    const navigation = [
        ['#features', t('landing.nav.features')],
        ['#ai', t('landing.nav.ai')],
        ['#planning', t('landing.nav.planning')],
        ['#security', t('landing.nav.security')],
    ];

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
            <Head title={t('landing.meta.title')}>
                <meta
                    name="description"
                    content={t('landing.meta.description')}
                />
            </Head>

            <div className="landing-page min-h-screen overflow-x-clip bg-[#050806] text-white">
                <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5.5 bg-[#050806]/82 backdrop-blur-xl">
                    <nav
                        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8"
                        aria-label={t('landing.nav.main')}
                    >
                        <a
                            href="#top"
                            className="rounded-sm focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none"
                            aria-label={t('landing.nav.home')}
                        >
                            <img
                                src="/images/logo-brand-dark-mode.png"
                                alt="XetaInvest"
                                className="h-8 w-auto"
                            />
                        </a>
                        <div className="hidden items-center gap-7 lg:flex">
                            {navigation.map(([href, label]) => (
                                <a
                                    key={href}
                                    href={href}
                                    className="text-xs text-white/45 transition hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none"
                                >
                                    {label}
                                </a>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <LanguageToggle />
                            <Link
                                href={login()}
                                className="hidden rounded-md px-3 py-2 text-xs font-medium text-white/55 transition hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none sm:inline-flex"
                            >
                                {t('auth.sign_in')}
                            </Link>
                            <LandingCta
                                registrationEnabled={registrationEnabled}
                                compact
                                className="hidden sm:inline-flex"
                            />
                            <button
                                type="button"
                                className="inline-flex size-9 items-center justify-center rounded-md border border-white/10 text-white/60 transition hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none sm:hidden"
                                aria-label={
                                    mobileNavigationOpen
                                        ? t('landing.nav.close_menu')
                                        : t('landing.nav.open_menu')
                                }
                                aria-controls="landing-mobile-navigation"
                                aria-expanded={mobileNavigationOpen}
                                onClick={() =>
                                    setMobileNavigationOpen((open) => !open)
                                }
                            >
                                {mobileNavigationOpen ? (
                                    <X className="size-4" />
                                ) : (
                                    <Menu className="size-4" />
                                )}
                            </button>
                        </div>
                    </nav>
                    {mobileNavigationOpen && (
                        <div
                            id="landing-mobile-navigation"
                            className="border-t border-white/5.5 bg-[#050806] px-5 py-5 sm:hidden"
                        >
                            <div className="mx-auto flex max-w-7xl flex-col gap-2">
                                {navigation.map(([href, label]) => (
                                    <a
                                        key={href}
                                        href={href}
                                        className="rounded-md px-3 py-2 text-sm text-white/60 transition hover:bg-white/4 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none"
                                        onClick={() =>
                                            setMobileNavigationOpen(false)
                                        }
                                    >
                                        {label}
                                    </a>
                                ))}
                                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/5.5 pt-4">
                                    <Link
                                        href={login()}
                                        className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 text-sm font-medium text-white/70 transition hover:border-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none"
                                    >
                                        {t('auth.sign_in')}
                                    </Link>
                                    <LandingCta
                                        registrationEnabled={
                                            registrationEnabled
                                        }
                                        compact
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </header>

                <main id="top">
                    <section className="relative flex min-h-[92vh] items-center overflow-hidden pt-28 pb-20">
                        <div className="landing-hero-grid absolute inset-0 opacity-45" />
                        <div className="landing-orb absolute -top-72 left-1/2 size-192 -translate-x-1/2 rounded-full bg-emerald-400/7.5 blur-[120px]" />
                        <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8">
                            <Reveal className="mx-auto max-w-5xl text-center">
                                <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/4.5 px-4 py-2 font-mono text-[9px] tracking-[0.18em] text-emerald-300 uppercase">
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
                                    <LandingCta
                                        registrationEnabled={
                                            registrationEnabled
                                        }
                                    />
                                    <a
                                        href="#features"
                                        className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/2.5 px-6 text-sm font-medium text-white/70 transition hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none"
                                    >
                                        {t('landing.cta.discover')}
                                        <ArrowDown className="size-4" />
                                    </a>
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

                    <div id="features">
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
                                <LandingCta
                                    registrationEnabled={registrationEnabled}
                                />
                            </div>
                        </Reveal>
                    </section>
                </main>

                <footer className="border-t border-white/5.5 py-8">
                    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 sm:flex-row sm:px-8">
                        <img
                            src="/images/logo-brand-dark-mode.png"
                            alt="XetaInvest"
                            className="h-7 w-auto opacity-80"
                        />
                        <div className="flex items-center gap-5 text-xs text-white/35">
                            <Link
                                href={login()}
                                className="transition hover:text-white"
                            >
                                {t('auth.sign_in')}
                            </Link>
                            {registrationEnabled && (
                                <Link
                                    href="/register"
                                    className="transition hover:text-white"
                                >
                                    {t('auth.sign_up')}
                                </Link>
                            )}
                            <a
                                href="https://github.com/XetaIO/XetaInvest"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 transition hover:text-white"
                            >
                                <Github className="size-4" />
                                GitHub
                            </a>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
