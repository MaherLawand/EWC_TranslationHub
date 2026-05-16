import countries from "i18n-iso-countries"

import enLocale from "i18n-iso-countries/langs/en.json"

countries.registerLocale(enLocale)

export type Language = {

  code: string

  name: string

}

const languageCodes = [

  "en",

  "ar",

  "fr",

  "es",

  "de",

  "it",

  "pt",

  "ja",

  "ko",

  "zh",

  "ru",

  "tr",

  "hi",

  "ur",

  "fa",

  "nl",

  "sv",

  "pl",

  "uk",

  "th",

  "vi",

  "id",

  "ms",

  "bn",

  "ta",

  "el",

  "he",

  "ro",

  "cs",

  "hu",

  "da",

  "fi",

  "no",

]

export const LANGUAGES: Language[] =

  languageCodes

    .map((code) => {

      const name =

        new Intl.DisplayNames(

          ["en"],

          {

            type: "language",

          }

        ).of(code)

      return {

        code,

        name: name || code,

      }

    })

    .sort((a, b) =>

      a.name.localeCompare(

        b.name

      )

    )