import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import i18n from '@/lib/i18n';
import type { SharedData } from '@/types';

/**
 * Synchronise i18next avec la locale partagée par Inertia (backend).
 * À utiliser une seule fois au niveau du layout racine.
 */
export function useLocale(): 'fr' | 'en' {
    const { locale } = usePage<SharedData>().props;

    useEffect(() => {
        if (locale && i18n.language !== locale) {
            void i18n.changeLanguage(locale);
        }
    }, [locale]);

    return locale ?? 'fr';
}
