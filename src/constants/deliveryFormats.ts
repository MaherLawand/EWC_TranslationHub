// Delivery format enum values (must match Prisma `DeliveryFormat`) and their
// human-friendly display labels.
export const DELIVERY_FORMAT_LABELS: Record<string, string> = {
  TEXT: "TEXT",
  SRT: "SRT",
  BURNED_IN: "BURNED IN",
  EMBEDDED_SUBS: "Embedded subs",
  ON_SCREEN_TEXT: "On Screen Text",
  GRAPHIC_TEXT: "Graphic Text",
  VO_TRANSLATIONS: "VO Translations",
}

export function formatLabel(value: string): string {
  return DELIVERY_FORMAT_LABELS[value] ?? value
}

// Options shown when creating/editing a BROADCAST order.
export const BROADCAST_FORMAT_OPTIONS = [
  { value: "SRT", label: "SRT" },
  { value: "BURNED_IN", label: "BURNED IN" },
]

// Options shown when creating/editing a MARKETING order.
export const MARKETING_FORMAT_OPTIONS = [
  { value: "SRT", label: "SRT" },
  { value: "EMBEDDED_SUBS", label: "Embedded subs" },
  { value: "ON_SCREEN_TEXT", label: "On Screen Text" },
  { value: "GRAPHIC_TEXT", label: "Graphic Text" },
  { value: "VO_TRANSLATIONS", label: "VO Translations" },
]
