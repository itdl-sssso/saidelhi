import { timestamp, varchar } from "drizzle-orm/mysql-core";
import { ulid } from "ulidx";

export const newId = () => ulid();

/** ULID primary key, generated app-side. */
export const idPk = () => varchar("id", { length: 26 }).primaryKey().$defaultFn(newId);

/** Column referencing a ULID id. */
export const idRef = (name: string) => varchar(name, { length: 26 });

export const createdAt = () => timestamp("created_at", { mode: "date" }).notNull().defaultNow();

export const timestamps = () => ({
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
});
