/**
 * i18n setup for the driver app.
 * Mirror of kyra-rider/services/i18n.ts. Shares the same en/hi/kn locale
 * JSONs (driver-specific strings will be added under a `driver` namespace
 * in the JSON as we translate driver screens).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { type LanguageDetectorAsyncModule } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import hi from '@/locales/hi.json';
import kn from '@/locales/kn.json';

import { supabase } from './supabase';

export type LangCode = 'en' | 'hi' | 'kn';
export const SUPPORTED: LangCode[] = ['en', 'hi', 'kn'];

const STORAGE_KEY = 'kyra:lang';

const detector: LanguageDetectorAsyncModule = {
  type: 'languageDetector',
  async: true,
  init: () => {},
  detect: async (cb) => {
    try {
      const saved = (await AsyncStorage.getItem(STORAGE_KEY)) as LangCode | null;
      cb(saved && SUPPORTED.includes(saved) ? saved : 'en');
    } catch {
      cb('en');
    }
  },
  cacheUserLanguage: async (lng) => {
    try { await AsyncStorage.setItem(STORAGE_KEY, lng); } catch { /* silent */ }
  },
};

void i18n
  .use(detector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      kn: { translation: kn },
    },
    fallbackLng: 'en',
    compatibilityJSON: 'v4',
    interpolation: { escapeValue: false },
    returnNull: false,
  });

export async function getStoredLanguage(): Promise<LangCode | null> {
  try {
    const v = (await AsyncStorage.getItem(STORAGE_KEY)) as LangCode | null;
    return v && SUPPORTED.includes(v) ? v : null;
  } catch {
    return null;
  }
}

export async function setLanguage(lng: LangCode): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, lng);
  await i18n.changeLanguage(lng);

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (userId) {
    await supabase.from('profiles').update({ language_pref: lng }).eq('id', userId);
  }
}

export { i18n };
