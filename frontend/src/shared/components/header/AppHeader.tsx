import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { LandingCta } from '../../../features/Pages/components/landing-cta';
import LanguageSwitcher from './LanguageSwitcher';

const landingSectionClassName =
    'text-xs text-white/45 transition hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none';

const landingSectionMobileClassName =
    'rounded-md px-3 py-2 text-sm text-white/60 transition hover:bg-white/4 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none';

export function AppHeader() {
    const { t } = useTranslation();
    const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

    const navigation = [
        { hash: 'features', label: t('landing.nav.features') },
        { hash: 'ai', label: t('landing.nav.ai') },
        { hash: 'planning', label: t('landing.nav.planning') },
        { hash: 'security', label: t('landing.nav.security') },
    ];

    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5.5 bg-[#050806]/82 backdrop-blur-xl">
            <nav
                className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8"
                aria-label={t('landing.nav.main')}
            >
                <Link
                    to="/"
                    className="rounded-sm focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none"
                    aria-label={t('landing.nav.home')}
                >
                    <img
                        src="/images/logo-brand-dark-mode.png"
                        alt="XetaInvest"
                        className="h-8 w-auto"
                    />
                </Link>
                <div className="hidden items-center gap-7 lg:flex">
                    {navigation.map(({ hash, label }) => (
                        <Link
                            key={hash}
                            to={{ pathname: '/', hash: `#${hash}` }}
                            preventScrollReset
                            className={landingSectionClassName}
                        >
                            {label}
                        </Link>
                    ))}
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="dark">
                        <LanguageSwitcher compact />
                    </div>
                    <Link
                        to="/login"
                        className="hidden rounded-md px-3 py-2 text-xs font-medium text-white/55 transition hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none sm:inline-flex"
                    >
                        {t('auth.sign_in')}
                    </Link>
                    <LandingCta compact className="hidden sm:inline-flex" />
                    <button
                        type="button"
                        className="inline-flex size-9 items-center justify-center rounded-md border border-white/10 text-white/60 transition hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none lg:hidden"
                        aria-label={
                            mobileNavigationOpen
                                ? t('landing.nav.close_menu')
                                : t('landing.nav.open_menu')
                        }
                        aria-controls="landing-mobile-navigation"
                        aria-expanded={mobileNavigationOpen}
                        onClick={() => setMobileNavigationOpen((open) => !open)}
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
                    className="border-t border-white/5.5 bg-[#050806] px-5 py-5 lg:hidden"
                >
                    <div className="mx-auto flex max-w-7xl flex-col gap-2">
                        {navigation.map(({ hash, label }) => (
                            <Link
                                key={hash}
                                to={{ pathname: '/', hash: `#${hash}` }}
                                preventScrollReset
                                className={landingSectionMobileClassName}
                                onClick={() => setMobileNavigationOpen(false)}
                            >
                                {label}
                            </Link>
                        ))}
                        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/5.5 pt-4">
                            <Link
                                to="/login"
                                className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 text-sm font-medium text-white/70 transition hover:border-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none"
                            >
                                {t('auth.sign_in')}
                            </Link>
                            <LandingCta compact />
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
