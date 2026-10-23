import { MigrationRunCreate, UPLOAD_LIMITS } from "@/contract";
import { created, ok } from "@/server/http/envelope";
import { ApiError } from "@/server/http/errors";
import { readMultipart } from "@/server/http/multipart";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Latest 20 runs. */
export const GET = adminRoute({ permission: "migration.run" }, async ({ actor }) => ok(await services().portal.migration.list(actor)));

/** JSON `{source:"legacy_db"}` or multipart (`source=sitemap`, `file`) → 201 `MigrationRun` (status `mapping`). */
export const POST = adminRoute({ permission: "migration.run" }, async ({ actor, req, locale }) => {
  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const { file, fields } = await readMultipart(req, MigrationRunCreate, { maxBytes: UPLOAD_LIMITS.sheetBytes, locale });
    return created(await services().portal.migration.create(actor, fields.source, file));
  }
  const parsed = MigrationRunCreate.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError("VALIDATION_FAILED", { fields: { source: "Choose a source." } });
  return created(await services().portal.migration.create(actor, parsed.data.source));
});
