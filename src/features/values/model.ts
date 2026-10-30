import type { IconName } from "@/ui/Icon";
import type { ValueKey } from "@/features/home/values";

/** Glyph per strand (thought/word/deed and the like), from the design wireframe. */
export const STRAND_ICONS: Record<ValueKey, [IconName, IconName, IconName]> = {
  sathya: ["sun", "quote", "hand-heart"],
  dharma: ["house", "briefcase", "users"],
  shanti: ["moon", "music", "wind"],
  prema: ["heart", "hand-heart", "users"],
  ahimsa: ["message-circle", "leaf", "sprout"],
};

/** Closing call to action per value: where it leads and its icon. */
export const PRACTICE_CTA: Record<ValueKey, { href: string; icon: IconName }> = {
  sathya: { href: "/centres/map", icon: "book-open" },
  dharma: { href: "/programs/medical", icon: "stethoscope" },
  shanti: { href: "/calendar?sevaType=bhajan", icon: "music" },
  prema: { href: "/join", icon: "hand-heart" },
  ahimsa: { href: "/join?sevaType=cleanliness", icon: "sprout" },
};
