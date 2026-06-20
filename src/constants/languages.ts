export type Language = {
  code: string
  name: string
}

// Full ISO 639-1 language set. Names are resolved via Intl.DisplayNames so the
// list stays comprehensive (Mongolian, Lao, etc. are all included) without
// hand-maintaining display strings. Any code Intl can't name falls back to the
// code itself and is filtered only if empty.
const languageCodes = [
  "aa", "ab", "ae", "af", "ak", "am", "an", "ar", "as", "av", "ay", "az",
  "ba", "be", "bg", "bi", "bm", "bn", "bo", "br", "bs",
  "ca", "ce", "ch", "co", "cr", "cs", "cu", "cv", "cy",
  "da", "de", "dv", "dz",
  "ee", "el", "en", "eo", "es", "et", "eu",
  "fa", "ff", "fi", "fj", "fo", "fr", "fy",
  "ga", "gd", "gl", "gn", "gu", "gv",
  "ha", "he", "hi", "ho", "hr", "ht", "hu", "hy", "hz",
  "ia", "id", "ie", "ig", "ii", "ik", "io", "is", "it", "iu",
  "ja", "jv",
  "ka", "kg", "ki", "kj", "kk", "kl", "km", "kn", "ko", "kr", "ks", "ku", "kv", "kw", "ky",
  "la", "lb", "lg", "li", "ln", "lo", "lt", "lu", "lv",
  "mg", "mh", "mi", "mk", "ml", "mn", "mr", "ms", "mt", "my",
  "na", "nb", "nd", "ne", "ng", "nl", "nn", "no", "nr", "nv", "ny",
  "oc", "oj", "om", "or", "os",
  "pa", "pi", "pl", "ps", "pt",
  "qu",
  "rm", "rn", "ro", "ru", "rw",
  "sa", "sc", "sd", "se", "sg", "si", "sk", "sl", "sm", "sn", "so", "sq", "sr", "ss", "st", "su", "sv", "sw",
  "ta", "te", "tg", "th", "ti", "tk", "tl", "tn", "to", "tr", "ts", "tt", "tw", "ty",
  "ug", "uk", "ur", "uz",
  "ve", "vi", "vo",
  "wa", "wo",
  "xh",
  "yi", "yo",
  "za", "zh", "zu",
]

const displayNames = new Intl.DisplayNames(["en"], { type: "language" })

export const LANGUAGES: Language[] = languageCodes
  .map((code) => {
    let name = code
    try {
      name = displayNames.of(code) || code
    } catch {
      /* keep code as fallback */
    }
    return { code, name }
  })
  // Drop any entry whose name didn't resolve to something human-readable
  // (i.e. it's still just the raw 2-letter code).
  .filter((l) => l.name && l.name !== l.code)
  .sort((a, b) => a.name.localeCompare(b.name))
