import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface LandingCtaProps {
    registrationEnabled: boolean;
    className?: string;
    compact?: boolean;
}

export function LandingCta({
    registrationEnabled,
    className,
    compact = false,
}: LandingCtaProps) {
    const { t } = useTranslation();
    const classes = cn(
        'group inline-flex items-center justify-center gap-2 rounded-md bg-emerald-400 font-semibold text-[#03110c] shadow-[0_0_32px_rgba(52,211,153,0.18)] transition hover:bg-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050806] focus-visible:outline-none',
        compact ? 'h-9 px-4 text-sm' : 'h-12 px-6 text-sm sm:text-base',
        className,
    );

    const label = registrationEnabled
        ? t('landing.cta.create_account')
        : t('landing.cta.install_project');

    const icon = (
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
    );

    if (!registrationEnabled) {
        return (
            <a
                href="https://github.com/XetaIO/XetaInvest"
                target="_blank"
                rel="noreferrer"
                className={classes}
            >
                {label}
                {icon}
            </a>
        );
    }

    return (
        <Link href="/register" className={classes}>
            {label}
            {icon}
        </Link>
    );
}
