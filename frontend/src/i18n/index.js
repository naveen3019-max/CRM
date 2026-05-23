import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import enCommon from "./locales/en/common.json";
import hiCommon from "./locales/hi/common.json";
import knCommon from "./locales/kn/common.json";
import teCommon from "./locales/te/common.json";
import taCommon from "./locales/ta/common.json";
import mlCommon from "./locales/ml/common.json";

export const SUPPORTED_LANGUAGES = ["en", "hi", "kn", "te", "ta", "ml"];

export function normalizeLanguageCode(language) {
  const code = String(language || "").trim().toLowerCase();
  if (!code) return "en";
  const short = code.split("-")[0];
  return SUPPORTED_LANGUAGES.includes(short) ? short : "en";
}

function humanizeKey(key) {
  const tail = String(key || "")
    .split(".")
    .pop()
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();

  if (!tail) {
    return key;
  }

  return tail
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

i18n.use(LanguageDetector).use(initReactI18next);

const resources = {
  en: { common: enCommon },
  hi: { common: hiCommon },
  kn: { common: knCommon },
  te: { common: teCommon },
  ta: { common: taCommon },
  ml: { common: mlCommon }
};

i18n.init({
  resources,
  fallbackLng: "en",
  supportedLngs: SUPPORTED_LANGUAGES,
  ns: ["common"],
  defaultNS: "common",
  interpolation: { escapeValue: false },
  detection: {
    order: ["localStorage"],
    lookupLocalStorage: "verbena_language",
    caches: ["localStorage"]
  },
  load: "languageOnly",
  react: { useSuspense: false, transEmptyNodeValue: "", useSuspenseContainer: false },
  parseMissingKeyHandler: (key) => humanizeKey(key),
  missingKeyHandler: (lngs, ns, key) => {
    console.warn(`Missing translation key: ${ns}:${key} for language(s): ${lngs.join(", ")}`);
    return key;
  }
}, (err) => {
  if (err) console.error("i18n initialization error:", err);
  else console.log("i18n initialized successfully");
});

export default i18n;
