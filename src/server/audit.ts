// The single way audit rows are made. Portal writes pass these records to the
// repository, which inserts them in the same transaction as the change; there
// is deliberately no update/delete path for audit_log.
import type { Actor } from "./auth/rbac";
import type { AuditRec } from "./repo/types";

/** Background jobs and webhooks act as `system`; public form links as `public`. */
export interface SystemActor {
  kind: "system" | "public";
  requestId?: string | null;
}

export type AuditActor = Actor | SystemActor;

const isSystem = (a: AuditActor): a is SystemActor => "kind" in a;

export interface AuditInput {
  action: string;
  entity: string;
  entityId: string | null;
  /** Org unit the change belongs to (district or samithi), for scoped reads later. */
  scopeId?: string | null;
  /** Before/after and context. Never raw phones or tokens. */
  data?: Record<string, unknown> | null;
}

export function auditRec(actor: AuditActor, input: AuditInput): AuditRec {
  const sys = isSystem(actor);
  return {
    actorId: sys ? null : actor.userId,
    actorRole: sys ? actor.kind : actor.role,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    scopeId: input.scopeId ?? null,
    requestId: sys ? (actor.requestId ?? null) : actor.ctx.requestId,
    ipHash: sys ? null : actor.ctx.ipHash,
    data: input.data ?? null,
  };
}

/** Before/after of the changed keys only. */
export function diff<T extends object>(before: T, after: Partial<T>): { before: Partial<T>; after: Partial<T> } {
  const b: Partial<T> = {};
  const a: Partial<T> = {};
  for (const k of Object.keys(after) as (keyof T)[]) {
    const next = after[k];
    if (next === undefined) continue;
    if (JSON.stringify(before[k]) === JSON.stringify(next)) continue;
    b[k] = before[k];
    a[k] = next;
  }
  return { before: b, after: a };
}
