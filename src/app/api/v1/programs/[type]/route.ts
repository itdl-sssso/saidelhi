import { ProgramParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { notFound } from "@/server/http/errors";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

export const GET = route({ params: ProgramParams }, async ({ params }) => {
  const program = await services().programs.byType(params.type);
  if (!program) throw notFound();
  return ok(program);
});
