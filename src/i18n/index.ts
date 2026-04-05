import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import ml from './locales/ml.json';
import hi from './locales/hi.json';
import kn from './locales/kn.json';

const resources = {
    en: { translation: en },
    ta: { translation: ta },
    te: { translation: te },
    ml: { translation: ml },
    hi: { translation: hi },
    kn: { translation: kn }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        supportedLngs: ['en', 'ta', 'te', 'ml', 'hi', 'kn'],
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
