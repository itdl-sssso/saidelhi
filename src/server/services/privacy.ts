import type { PrivacyRequestParsed } from "@/contract";
import { newId } from "../db/columns";
import type { DataRepo } from "../repo/types";
import type { PrivacyRequestMeta, PrivacyService, ServiceDeps } from "./types";

/** DPDP: reply within 30 days (spec 17). */
const REPLY_WINDOW_DAYS = 30;

export function createPrivacyService(repo: DataRepo, deps: ServiceDeps): PrivacyService {
  return {
    async createRequest(input: PrivacyRequestParsed, meta: PrivacyRequestMeta): Promise<{ id: string }> {
      const id = newId();
      const dueAt = new Date(deps.now().getTime() + REPLY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
      await repo.createPrivacyRequest(
        {
          id,
          name: input.name,
          phone: input.phone.replace(/[\s-]/g, ""),
          type: input.type,
          details: input.details,
          locale: input.locale ?? "en",
          dueAt,
          ipHash: meta.ipHash,
        },
        {
          actorId: null,
          actorRole: "public",
          action: "privacy_request.create",
          entity: "privacy_request",
          entityId: id,
          scopeId: null,
          requestId: meta.requestId,
          ipHash: meta.ipHash,
          // Never log the personal fields themselves.
          data: { type: input.type },
        },
      );
      return { id };
    },
  };
}
