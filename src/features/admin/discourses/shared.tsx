"use client";

import { useTranslations } from "next-intl";
import type { DiscourseBlockStatus, DiscourseStatus } from "@/contract";
import { Pill, type Tone } from "../kit";

export const STATUS_TONE: Record<DiscourseStatus, Tone> = { not_started: "slate", ai_draft: "pink", in_review: "yellow", approved: "blue", published: "green" };
export const BLOCK_TONE: Record<DiscourseBlockStatus, Tone> = { empty: "slate", ai_draft: "pink", edited: "yellow", approved: "green" };

export function StatusPill({ status }: { status: DiscourseStatus }) {
  const t = useTranslations("admin.discourses");
  return <Pill tone={STATUS_TONE[status]}>{t(`status.${status}`)}</Pill>;
}

export function BlockPill({ status }: { status: DiscourseBlockStatus }) {
  const t = useTranslations("admin.discourses");
  return <Pill tone={BLOCK_TONE[status]}>{t(`blockStatus.${status}`)}</Pill>;
}
