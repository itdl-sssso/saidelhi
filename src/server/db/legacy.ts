/**
 * Legacy Django tables of the live saidelhi.org database (docs/db/saidelhi-schema.sql).
 *
 * Introspected with `pnpm db:pull` and curated by hand. These tables are read and
 * written through Drizzle but are NEVER part of migrations: drizzle.config.ts only
 * points at ./src/server/db/schema/*. Do not change column definitions here unless
 * the live Django schema changed first.
 *
 * Datetimes are Django `USE_TZ` values stored in UTC; the mysql2 pool runs with
 * timezone 'Z' so `mode: 'date'` yields correct instants.
 */
import {
  bigint,
  boolean,
  check,
  datetime,
  index,
  int,
  longtext,
  mysqlTable,
  primaryKey,
  smallint,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

// --- Django auth ------------------------------------------------------------

export const authGroup = mysqlTable(
  "auth_group",
  {
    id: int().autoincrement().notNull(),
    name: varchar({ length: 150 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.id], name: "auth_group_id" }), unique("name").on(t.name)],
);

export const djangoContentType = mysqlTable(
  "django_content_type",
  {
    id: int().autoincrement().notNull(),
    appLabel: varchar("app_label", { length: 100 }).notNull(),
    model: varchar({ length: 100 }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id], name: "django_content_type_id" }),
    unique("django_content_type_app_label_model_76bd3d3b_uniq").on(t.appLabel, t.model),
  ],
);

export const authPermission = mysqlTable(
  "auth_permission",
  {
    id: int().autoincrement().notNull(),
    name: varchar({ length: 255 }).notNull(),
    contentTypeId: int("content_type_id")
      .notNull()
      .references(() => djangoContentType.id),
    codename: varchar({ length: 100 }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id], name: "auth_permission_id" }),
    unique("auth_permission_content_type_id_codename_01ab375a_uniq").on(t.contentTypeId, t.codename),
  ],
);

export const authGroupPermissions = mysqlTable(
  "auth_group_permissions",
  {
    id: bigint({ mode: "number" }).autoincrement().notNull(),
    groupId: int("group_id")
      .notNull()
      .references(() => authGroup.id),
    permissionId: int("permission_id")
      .notNull()
      .references(() => authPermission.id),
  },
  (t) => [
    primaryKey({ columns: [t.id], name: "auth_group_permissions_id" }),
    unique("auth_group_permissions_group_id_permission_id_0cd325b0_uniq").on(t.groupId, t.permissionId),
  ],
);

/** Django admin accounts. Passwords are Django hashes; never exposed or reused. */
export const authUser = mysqlTable(
  "auth_user",
  {
    id: int().autoincrement().notNull(),
    password: varchar({ length: 128 }).notNull(),
    lastLogin: datetime("last_login", { mode: "date", fsp: 6 }),
    isSuperuser: boolean("is_superuser").notNull(),
    username: varchar({ length: 150 }).notNull(),
    firstName: varchar("first_name", { length: 150 }).notNull(),
    lastName: varchar("last_name", { length: 150 }).notNull(),
    email: varchar({ length: 254 }).notNull(),
    isStaff: boolean("is_staff").notNull(),
    isActive: boolean("is_active").notNull(),
    dateJoined: datetime("date_joined", { mode: "date", fsp: 6 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.id], name: "auth_user_id" }), unique("username").on(t.username)],
);

export const authUserGroups = mysqlTable(
  "auth_user_groups",
  {
    id: bigint({ mode: "number" }).autoincrement().notNull(),
    userId: int("user_id")
      .notNull()
      .references(() => authUser.id),
    groupId: int("group_id")
      .notNull()
      .references(() => authGroup.id),
  },
  (t) => [
    primaryKey({ columns: [t.id], name: "auth_user_groups_id" }),
    unique("auth_user_groups_user_id_group_id_94350c0c_uniq").on(t.userId, t.groupId),
  ],
);

export const authUserUserPermissions = mysqlTable(
  "auth_user_user_permissions",
  {
    id: bigint({ mode: "number" }).autoincrement().notNull(),
    userId: int("user_id")
      .notNull()
      .references(() => authUser.id),
    permissionId: int("permission_id")
      .notNull()
      .references(() => authPermission.id),
  },
  (t) => [
    primaryKey({ columns: [t.id], name: "auth_user_user_permissions_id" }),
    unique("auth_user_user_permissions_user_id_permission_id_14a6b632_uniq").on(t.userId, t.permissionId),
  ],
);

// --- Django internals (left alone) --------------------------------------------

export const djangoAdminLog = mysqlTable(
  "django_admin_log",
  {
    id: int().autoincrement().notNull(),
    actionTime: datetime("action_time", { mode: "date", fsp: 6 }).notNull(),
    objectId: longtext("object_id"),
    objectRepr: varchar("object_repr", { length: 200 }).notNull(),
    actionFlag: smallint("action_flag", { unsigned: true }).notNull(),
    changeMessage: longtext("change_message").notNull(),
    contentTypeId: int("content_type_id").references(() => djangoContentType.id),
    userId: int("user_id")
      .notNull()
      .references(() => authUser.id),
  },
  (t) => [
    primaryKey({ columns: [t.id], name: "django_admin_log_id" }),
    check("django_admin_log_chk_1", sql`(\`action_flag\` >= 0)`),
  ],
);

export const djangoMigrations = mysqlTable(
  "django_migrations",
  {
    id: bigint({ mode: "number" }).autoincrement().notNull(),
    app: varchar({ length: 255 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    applied: datetime({ mode: "date", fsp: 6 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.id], name: "django_migrations_id" })],
);

export const djangoSession = mysqlTable(
  "django_session",
  {
    sessionKey: varchar("session_key", { length: 40 }).notNull(),
    sessionData: longtext("session_data").notNull(),
    expireDate: datetime("expire_date", { mode: "date", fsp: 6 }).notNull(),
  },
  (t) => [
    index("django_session_expire_date_a5c62663").on(t.expireDate),
    primaryKey({ columns: [t.sessionKey], name: "django_session_session_key" }),
  ],
);

// --- Site content ---------------------------------------------------------------

/**
 * Articles. `category` is a single legacy letter (N/A/C/D/K/S/P) mapped to the
 * contract ArticleCategory in src/server/domain/articles.ts. `content` is
 * CKEditor HTML and must be sanitised before it leaves the server. Hindi and
 * extra metadata live in the `article_i18n` side table.
 */
export const postcontentPostcontent = mysqlTable(
  "postcontent_postcontent",
  {
    id: bigint({ mode: "number" }).autoincrement().notNull(),
    title: varchar({ length: 150 }).notNull(),
    slug: varchar({ length: 50 }).notNull(),
    category: varchar({ length: 1 }).notNull(),
    shortDescription: varchar("short_description", { length: 500 }).notNull(),
    content: longtext(),
    featuredImage: varchar("featured_image", { length: 100 }).notNull(),
    createdAt: datetime("created_at", { mode: "date", fsp: 6 }).notNull(),
    updatedAt: datetime("updated_at", { mode: "date", fsp: 6 }).notNull(),
    createdById: int("created_by_id").references(() => authUser.id),
    updatedById: int("updated_by_id").references(() => authUser.id),
    badgeTag: varchar("badge_tag", { length: 200 }),
  },
  (t) => [primaryKey({ columns: [t.id], name: "postcontent_postcontent_id" }), unique("slug").on(t.slug)],
);

/** Article gallery images (paths relative to MEDIA_ROOT). */
export const postcontentContentpostimage = mysqlTable(
  "postcontent_contentpostimage",
  {
    id: bigint({ mode: "number" }).autoincrement().notNull(),
    image: varchar({ length: 100 }).notNull(),
    caption: varchar({ length: 255 }),
    order: int({ unsigned: true }).notNull(),
    blogPostId: bigint("blog_post_id", { mode: "number" })
      .notNull()
      .references(() => postcontentPostcontent.id),
  },
  (t) => [
    primaryKey({ columns: [t.id], name: "postcontent_contentpostimage_id" }),
    check("postcontent_contentpostimage_chk_1", sql`(\`order\` >= 0)`),
  ],
);

/** Home page slider images. */
export const postcontentSliderimages = mysqlTable(
  "postcontent_sliderimages",
  {
    id: bigint({ mode: "number" }).autoincrement().notNull(),
    slider: varchar({ length: 100 }).notNull(),
    caption1: varchar({ length: 255 }),
    caption2: varchar({ length: 255 }),
    order: int({ unsigned: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id], name: "postcontent_sliderimages_id" }),
    check("postcontent_sliderimages_chk_1", sql`(\`order\` >= 0)`),
  ],
);

/** District team members. Contains personal data (email, phone): never expose publicly. */
export const districtmembersTeammembers = mysqlTable(
  "districtmembers_teammembers",
  {
    id: bigint({ mode: "number" }).autoincrement().notNull(),
    name: varchar({ length: 100 }).notNull(),
    title: varchar({ length: 100 }).notNull(),
    email: varchar({ length: 50 }).notNull(),
    phone: varchar({ length: 20 }).notNull(),
    photo: varchar({ length: 100 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.id], name: "districtmembers_teammembers_id" })],
);

export type LegacyPost = typeof postcontentPostcontent.$inferSelect;
export type LegacyPostImage = typeof postcontentContentpostimage.$inferSelect;
export type LegacySliderImage = typeof postcontentSliderimages.$inferSelect;
