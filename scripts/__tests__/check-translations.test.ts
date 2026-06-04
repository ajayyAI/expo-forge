import { findTranslationParityErrors } from "../check-translations";

test("flags keys present in base locale but missing in another", () => {
  const locales = {
    en: { hello: "Hi", bye: "Bye" },
    fr: { hello: "Salut" },
  };
  expect(findTranslationParityErrors(locales, "en")).toEqual([
    { locale: "fr", missing: ["bye"], extra: [] },
  ]);
});

test("passes when all locales match base", () => {
  const locales = { en: { a: "1" }, fr: { a: "2" } };
  expect(findTranslationParityErrors(locales, "en")).toEqual([]);
});

test("handles nested keys with dot paths", () => {
  const locales = {
    en: { a: { b: "1", c: "2" } },
    fr: { a: { b: "1" } },
  };
  expect(findTranslationParityErrors(locales, "en")).toEqual([
    { locale: "fr", missing: ["a.c"], extra: [] },
  ]);
});
