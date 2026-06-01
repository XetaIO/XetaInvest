import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import fr from '@/locales/fr.json';

i18n.use(initReactI18next).init({
    resources: {
        fr: { translation: fr },
        en: { translation: en },
    },
    lng: 'fr',
    fallbackLng: 'fr',
    interpolation: {
        escapeValue: false, // React escapes by default
    },
});

export default i18n;
