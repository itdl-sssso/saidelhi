// Audit log reads (spec 48) and private attachment access (logged).
import type { AuditEntry, AuditQuery, Paged } from "@/contract";
import { auditRec } from "../../audit";
import { type Actor, assertCan, inScope } from "../../auth/rbac";
import { addDays, istDayStart, toIso } from "../../domain/time";
import { ApiError } from "../../http/errors";
import type { AttachmentRec } from "../../repo/links-types";
import type { PortalCtx } from "./shared";

export interface AuditService {
  list(actor: Actor, q: AuditQuery): Promise<Paged<AuditEntry>>;
}

export interface AttachmentsService {
  /** Authorises and logs a view; the route streams the file. */
  open(actor: Actor, id: string): Promise<AttachmentRec>;
}

export function createAuditService(ctx: PortalCtx): AuditService {
  const { repo } = ctx;
  return {
    async list(actor, q) {
      assertCan(actor, "audit.read");
      const { rows, total } = await repo.portal.listAudit({
        action: q.action,
        entity: q.entity,
        entityId: q.entityId,
        actorId: q.actor,
        from: q.from ? istDayStart(q.from) : undefined,
        to: q.to ? istDayStart(addDays(q.to, 1)) : undefined,
        limit: q.pageSize,
        offset: (q.page - 1) * q.pageSize,
      });
      const names = new Map((await repo.portal.usersByIds([...new Set(rows.map((r) => r.actorId).filter((x): x is string => !!x))])).map((u) => [u.id, u.name]));
      return {
        data: rows.map((r) => ({
          id: r.id,
          at: toIso(r.at),
          actor: { id: r.actorId, name: r.actorId ? (names.get(r.actorId) ?? null) : null, role: r.actorRole },
          action: r.action,
          entity: r.entity,
          entityId: r.entityId,
          scopeId: r.scopeId,
          requestId: r.requestId,
          data: r.data,
        })),
        meta: { page: q.page, pageSize: q.pageSize, total },
      };
    },
  };
}

export function createAttachmentsService(ctx: PortalCtx): AttachmentsService {
  const { repo } = ctx;
  return {
    async open(actor, id) {
      assertCan(actor, "attachments.read");
      const a = await repo.portal.attachmentById(id);
      const ev = a ? await repo.eventById(a.eventId) : null;
      if (!a || !ev || !inScope(actor, ev.samithiId)) throw new ApiError("NOT_FOUND");
      await repo.portal.insertAudit(
        auditRec(actor, { action: "attachment.view", entity: "attachment", entityId: a.id, scopeId: ev.samithiId, data: { eventId: ev.id, name: a.originalName, mime: a.mime } }),
      );
      return a;
    },
  };
}
