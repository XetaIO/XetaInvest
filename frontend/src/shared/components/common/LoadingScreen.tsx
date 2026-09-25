import { useTranslation } from 'react-i18next';

export function LoadingScreen() {
    const { t } = useTranslation();

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#050806]">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-emerald-400"></div>
                <p className="text-slate-600">{t('common.loading')}</p>
            </div>
        </div>
    );
}
