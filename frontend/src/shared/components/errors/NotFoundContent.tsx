import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface NotFoundContentProps {
    /** Title to display */
    title?: string;
    /** Message to display */
    message?: string;
    /** Link to go back to */
    backTo?: string;
    /** Label for the back link */
    backLabel?: string;
}

/**
 * Reusable 404 content component for use within pages/layouts
 * Does not include full-screen styling - meant to be embedded in existing layouts
 */
export function NotFoundContent({
    title,
    message,
    backTo = '/',
    backLabel,
}: NotFoundContentProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center py-32">
            <div className="mx-auto w-full max-w-60.5 text-center sm:max-w-118">
                <h1 className="mb-8 text-title-md font-bold text-white/90 xl:text-title-2xl">
                    {title || t('errors.not_found')}
                </h1>

                <img
                    src="/images/error/404.svg"
                    alt="404"
                    className="dark:hidden"
                />
                <img
                    src="/images/error/404-dark.svg"
                    alt="404"
                    className="hidden dark:block"
                />

                <p className="mt-10 mb-6 text-base text-gray-400 sm:text-lg">
                    {message || t('errors.page_not_found')}
                </p>

                <Link
                    to={backTo}
                    className="inline-flex items-center justify-center rounded-lg bg-brand-400 px-5 py-3.5 text-sm font-semibold text-[#03110c] shadow-[0_0_32px_rgba(52,211,153,0.18)] transition hover:bg-emerald-300"
                >
                    {backLabel || t('errors.back_to_home')}
                </Link>
            </div>
        </div>
    );
}
