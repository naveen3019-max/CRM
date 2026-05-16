import i18n from "i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

export const SUPPORTED_LANGUAGES = ["en", "hi", "kn", "te", "ta", "ml"];

export function normalizeLanguageCode(language) {
  const code = String(language || "").trim().toLowerCase();
  if (!code) return "en";
  const short = code.split("-")[0];
  return SUPPORTED_LANGUAGES.includes(short) ? short : "en";
}

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES,
    ns: ["common"],
    defaultNS: "common",
    interpolation: {
      escapeValue: false
    },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json"
    },
    detection: {
      // Only respect an explicit saved preference in localStorage.
      // Avoid automatic detection from the browser `navigator` or html tag so
      // unauthenticated users default to English.
      order: ["localStorage"],
      lookupLocalStorage: "verbena_language",
      caches: ["localStorage"]
    },
    load: "languageOnly",
    react: {
      useSuspense: false,
      transEmptyNodeValue: "",
      useSuspenseContainer: false
    },
    missingKeyHandler: (lngs, ns, key) => {
      console.warn(`Missing translation key: ${ns}:${key} for language(s): ${lngs.join(", ")}`);
      return key;
    }
  }, (err, t) => {
    if (err) {
      console.error("i18n initialization error:", err);
    } else {
      console.log("i18n initialized successfully");
    }
  });

export default i18n;
