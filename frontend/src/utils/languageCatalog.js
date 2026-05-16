export const languageOptions = [
  { code: "en", label: "English" },
  { code: "kn", label: "Kannada" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "ml", label: "Malayalam" },
  { code: "mr", label: "Marathi" },
  { code: "gu", label: "Gujarati" },
  { code: "bn", label: "Bengali" },
  { code: "pa", label: "Punjabi" },
  { code: "ur", label: "Urdu" },
  { code: "es", label: "Spanish" }
];

const languageNameByCode = new Map(languageOptions.map((entry) => [entry.code, entry.label]));

export function getLanguageName(code) {
  if (!code) {
    return "English";
  }

  const normalized = String(code).trim().toLowerCase();
  return languageNameByCode.get(normalized) || normalized.toUpperCase();
}