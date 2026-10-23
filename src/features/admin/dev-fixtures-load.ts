// TEMP M6 until backend merge — see dev-fixtures.ts. Page fixtures are loaded lazily, dev only.
import { installDevFixtures } from "./dev-fixtures";

installDevFixtures([
  () => import("./settings/dev-fixtures"),
  () => import("./forms/dev-fixtures"),
  () => import("./partners/dev-fixtures"),
  () => import("./volunteers/dev-fixtures"),
  () => import("./centres/dev-fixtures"),
  () => import("./uploads/dev-fixtures"),
  () => import("./content/dev-fixtures"),
  () => import("./impact/dev-fixtures"),
  () => import("./migration/dev-fixtures"),
  () => import("./reports/dev-fixtures"),
  () => import("./health/dev-fixtures"),
]);
