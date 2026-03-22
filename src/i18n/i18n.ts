import { addTranslations, createLocalePrimitive, createI18nPrimitive } from 'solid-compose';

const localeModules = import.meta.glob<Record<string, string>>(
  '../location/*.json',
  { eager: true, import: 'default' }
);

/**
 * Dynamically loads all available translations from public/location/.
 * New languages are supported by adding a JSON file — no code changes needed.
 */
export function initI18n(): string[] {
  const tags: string[] = [];

  for (const [path, translations] of Object.entries(localeModules)) {
    // path is e.g. "/public/location/en.json" → extract "en"
    const match = path.match(/\/([^/]+)\.json$/);
    if (!match) continue;
    const tag = match[1];
    tags.push(tag);
    addTranslations(tag, translations);
  }

  if (tags.length === 0) {
    tags.push('en');
    addTranslations('en', {});
  }

  createLocalePrimitive({
    supportedLanguageTags: tags,
    defaultLanguageTag: tags[0],
  });

  createI18nPrimitive({
    fallbackLanguageTag: tags[0],
  });

  return tags;
}
