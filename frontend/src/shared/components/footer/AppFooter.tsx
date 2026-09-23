import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export function AppFooter() {
    const { t } = useTranslation();

    return (
        <footer className="border-t border-white/5.5 bg-[#050806] py-8">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 sm:flex-row sm:px-8">
                <img
                    src="/images/logo-brand-dark-mode.png"
                    alt="XetaInvest"
                    className="h-7 w-auto opacity-80"
                />
                <div className="flex items-center gap-5 text-xs text-white/35">
                    <Link to="/login" className="transition hover:text-white">
                        {t('auth.sign_in')}
                    </Link>
                    <a
                        href="https://github.com/XetaIO/XetaInvest"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 transition hover:text-white"
                    >
                        <ExternalLink className="size-4" />
                        GitHub
                    </a>
                </div>
            </div>
        </footer>
    );
}
