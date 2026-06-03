import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { SharedData } from '@/types';

/**
 * Synchronise i18next avec la locale partagée par Inertia (backend).
 * À utiliser une seule fois au niveau du layout racine.
 */
export function useLocale(): 'fr' | 'en' {
    const { locale } = usePage<SharedData>().props;
    const { i18n } = useTranslation();

    useEffect(() => {
        if (locale && i18n.resolvedLanguage !== locale) {
            void i18n.changeLanguage(locale);
        }
    }, [locale, i18n]);

    return locale ?? 'fr';
}
