// TEMP M6 until backend merge — see dev-fixtures.ts. Page fixtures are loaded lazily, dev only.
import { installDevFixtures } from "./dev-fixtures";

installDevFixtures([
  () => import("./settings/dev-fixtures"),
  () => import("./forms/dev-fixtures"),
  () => import("./partners/dev-fixtures"),
]);
