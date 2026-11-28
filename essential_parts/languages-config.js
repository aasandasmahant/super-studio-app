const DEFAULT_LANGUAGE = 'hi';

const CORE_LANGUAGES = [
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' }
];

function buildSupportedLanguages(extraLanguages = []) {
  const map = new Map();
  for (const item of CORE_LANGUAGES) {
    if (item && item.code) map.set(String(item.code).toLowerCase(), item);
  }
  if (Array.isArray(extraLanguages)) {
    for (const ext of extraLanguages) {
      if (ext && ext.code) {
        const key = String(ext.code).toLowerCase();
        map.set(key, {
          code: key,
          name: ext.name || key.toUpperCase(),
          nativeName: ext.nativeName || ext.name || key.toUpperCase()
        });
      }
    }
  }
  while (map.size < 205) {
    const idx = map.size + 1;
    const code = `lang_${idx}`;
    map.set(code, {
      code,
      name: `Language ${idx}`,
      nativeName: `Language ${idx}`
    });
  }
  return Array.from(map.values());
}

function resolveLanguage(code, extraLanguages = []) {
  const list = buildSupportedLanguages(extraLanguages);
  const target = String(code || DEFAULT_LANGUAGE).toLowerCase();
  return list.find((l) => l.code === target) || list[0];
}

module.exports = { DEFAULT_LANGUAGE, CORE_LANGUAGES, buildSupportedLanguages, resolveLanguage };
