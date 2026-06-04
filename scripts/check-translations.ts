/**
 * i18n translation parity check.
 *
 * Flattens every locale's keys to dot-paths and compares each non-base locale
 * against the base locale. Reports keys that are missing from a locale (present
 * in base, absent here) and keys that are extra (present here, absent in base).
 *
 * Run directly to check `src/translations/*.json`:
 *   bun scripts/check-translations.ts
 */

import fs from "node:fs";
import path from "node:path";

type TranslationValue = string | { [key: string]: TranslationValue };
type Translations = Record<string, TranslationValue>;
type Locales = Record<string, Translations>;

export interface ParityError {
  locale: string;
  missing: string[];
  extra: string[];
}

/** Recursively flatten a nested translation object into sorted dot-path keys. */
function flattenKeys(obj: TranslationValue, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") {
    return prefix ? [prefix] : [];
  }

  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    keys.push(...flattenKeys(obj[key], nextPrefix));
  }
  return keys;
}

/**
 * Compare every non-base locale against the base locale and return one entry
 * per locale that has differences. Locales that match the base are omitted.
 */
export function findTranslationParityErrors(
  locales: Locales,
  baseLocale: string
): ParityError[] {
  const baseKeys = new Set(flattenKeys(locales[baseLocale] ?? {}));
  const errors: ParityError[] = [];

  for (const locale of Object.keys(locales)) {
    if (locale === baseLocale) {
      continue;
    }

    const localeKeys = new Set(flattenKeys(locales[locale]));
    const missing = [...baseKeys].filter((key) => !localeKeys.has(key)).sort();
    const extra = [...localeKeys].filter((key) => !baseKeys.has(key)).sort();

    if (missing.length > 0 || extra.length > 0) {
      errors.push({ locale, missing, extra });
    }
  }

  return errors;
}

const BASE_LOCALE = "en";

function loadLocales(dir: string): Locales {
  const locales: Locales = {};
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) {
      continue;
    }
    const locale = path.basename(file, ".json");
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    locales[locale] = JSON.parse(raw) as Translations;
  }
  return locales;
}

function main(): void {
  // `import.meta.dir` is Bun's script-directory accessor (not in @types/node),
  // so resolution works regardless of the caller's CWD.
  const scriptDir = (import.meta as ImportMeta & { dir: string }).dir;
  const translationsDir = path.resolve(scriptDir, "..", "src", "translations");
  const locales = loadLocales(translationsDir);

  if (!locales[BASE_LOCALE]) {
    process.stderr.write(
      `Base locale "${BASE_LOCALE}.json" not found in ${translationsDir}\n`
    );
    process.exit(1);
  }

  const errors = findTranslationParityErrors(locales, BASE_LOCALE);

  if (errors.length === 0) {
    const count = Object.keys(locales).length;
    process.stdout.write(
      `✓ Translation parity OK — ${count} locales match the "${BASE_LOCALE}" base.\n`
    );
    return;
  }

  process.stderr.write(
    `✗ Translation parity errors (base locale: "${BASE_LOCALE}"):\n\n`
  );
  for (const { locale, missing, extra } of errors) {
    process.stderr.write(`  ${locale}:\n`);
    if (missing.length > 0) {
      process.stderr.write(
        `    missing (${missing.length}): ${missing.join(", ")}\n`
      );
    }
    if (extra.length > 0) {
      process.stderr.write(
        `    extra (${extra.length}): ${extra.join(", ")}\n`
      );
    }
    process.stderr.write("\n");
  }
  process.exit(1);
}

// Only run when executed directly, not when imported by the test suite.
if (require.main === module) {
  main();
}
