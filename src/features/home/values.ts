import type { ValueSlug } from "@/contract";
import type { IconName } from "@/ui/Icon";

/** The five human values, in petal order around the lotus (sathya first). */
export const VALUE_KEYS = ["sathya", "dharma", "shanti", "prema", "ahimsa"] as const satisfies readonly ValueSlug[];
export type ValueKey = (typeof VALUE_KEYS)[number];

export const VALUE_ICON: Record<ValueKey, IconName> = {
  sathya: "book-open",
  dharma: "graduation-cap",
  shanti: "music",
  prema: "hand-heart",
  ahimsa: "sprout",
};

export const valueEmblem = (k: ValueKey) => `/images/values/value-${k}.webp`;
export const valuePhoto = (k: ValueKey) => `/images/values/photo-${k}.webp`;
