import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from './en/en.json';
import fr from './fr/fr.json';

function syncDocumentLanguage(language: string) {
    document.documentElement.lang = i18n.resolvedLanguage || language;
}

i18n.on('languageChanged', syncDocumentLanguage);

void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'en',
        supportedLngs: ['en', 'fr'],
        load: 'languageOnly',
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng',
        },
        interpolation: { escapeValue: false },
        resources: {
            en: { translation: en },
            fr: { translation: fr },
        },
    });

export default i18n;
