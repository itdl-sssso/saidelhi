CREATE TABLE `article_i18n` (
	`legacy_id` bigint NOT NULL,
	`title_hi` varchar(300),
	`summary_hi` varchar(1000),
	`body_hi` longtext,
	`district_id` varchar(26),
	`event_id` varchar(26),
	`status` varchar(16) NOT NULL DEFAULT 'published',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `article_i18n_legacy_id` PRIMARY KEY(`legacy_id`)
);
--> statement-breakpoint
CREATE TABLE `content_item` (
	`id` varchar(26) NOT NULL,
	`kind` varchar(24) NOT NULL,
	`key` varchar(64),
	`title_en` varchar(300),
	`title_hi` varchar(300),
	`body_en` text,
	`body_hi` text,
	`source_en` varchar(300),
	`source_hi` varchar(300),
	`href` varchar(400),
	`date` date,
	`starts_at` datetime,
	`ends_at` datetime,
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`data` json,
	`sort_order` smallint NOT NULL DEFAULT 0,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `setting` (
	`key` varchar(64) NOT NULL,
	`value` json NOT NULL,
	`updated_by` varchar(26),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`note` text,
	CONSTRAINT `setting_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `event` (
	`id` varchar(26) NOT NULL,
	`seva_type` varchar(32) NOT NULL,
	`status` varchar(24) NOT NULL DEFAULT 'draft',
	`title_en` varchar(200) NOT NULL,
	`title_hi` varchar(200),
	`description_en` text,
	`description_hi` text,
	`starts_at` datetime NOT NULL,
	`ends_at` datetime,
	`postponed_to` datetime,
	`venue_name` varchar(200) NOT NULL,
	`venue_address` varchar(400) NOT NULL DEFAULT '',
	`venue_lat` decimal(9,6),
	`venue_lng` decimal(9,6),
	`samithi_id` varchar(26) NOT NULL,
	`district_id` varchar(26) NOT NULL,
	`centre_id` varchar(26),
	`partner_id` varchar(26),
	`volunteers_needed` int,
	`volunteers_joined` int NOT NULL DEFAULT 0,
	`bring` json NOT NULL DEFAULT ('[]'),
	`results_photos` json NOT NULL DEFAULT ('[]'),
	`recurring` boolean NOT NULL DEFAULT false,
	`source` varchar(16) NOT NULL DEFAULT 'portal',
	`created_by` varchar(26),
	`report_due_at` datetime,
	`approved_at` datetime,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `event_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_timeline` (
	`id` varchar(26) NOT NULL,
	`event_id` varchar(26) NOT NULL,
	`status` varchar(24) NOT NULL,
	`at` datetime(3),
	`by_role` varchar(24),
	`by_label` varchar(120),
	`by_user_id` varchar(26),
	`channel` varchar(16),
	`note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `event_timeline_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `impact_estimate` (
	`id` varchar(26) NOT NULL,
	`org_unit_id` varchar(26) NOT NULL,
	`seva_type` varchar(32),
	`kpi_key` varchar(64) NOT NULL,
	`month` date NOT NULL,
	`value` int NOT NULL,
	`note` text,
	`visible` boolean NOT NULL DEFAULT true,
	`created_by` varchar(26),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `impact_estimate_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submission_answer_kpi` (
	`id` varchar(26) NOT NULL,
	`event_id` varchar(26) NOT NULL,
	`submission_id` varchar(26),
	`kpi_key` varchar(64) NOT NULL,
	`dim` varchar(32) NOT NULL DEFAULT '',
	`value` int,
	`estimate` boolean NOT NULL DEFAULT false,
	`approved_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `submission_answer_kpi_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `centre` (
	`id` varchar(26) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`samithi_id` varchar(26) NOT NULL,
	`name_en` varchar(160) NOT NULL,
	`name_hi` varchar(160),
	`address_en` varchar(400) NOT NULL,
	`address_hi` varchar(400),
	`pincode` varchar(6),
	`lat` decimal(9,6),
	`lng` decimal(9,6),
	`contact_phone` varchar(20),
	`photos` json NOT NULL DEFAULT ('[]'),
	`active` boolean NOT NULL DEFAULT true,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `centre_id` PRIMARY KEY(`id`),
	CONSTRAINT `centre_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `centre_gathering` (
	`id` varchar(26) NOT NULL,
	`centre_id` varchar(26) NOT NULL,
	`day` tinyint NOT NULL,
	`time` varchar(5) NOT NULL,
	`kind` varchar(16) NOT NULL,
	`language` varchar(8) NOT NULL,
	`sort_order` smallint NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `centre_gathering_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `org_closure` (
	`ancestor_id` varchar(26) NOT NULL,
	`descendant_id` varchar(26) NOT NULL,
	`depth` tinyint NOT NULL,
	CONSTRAINT `org_closure_pk` PRIMARY KEY(`ancestor_id`,`descendant_id`)
);
--> statement-breakpoint
CREATE TABLE `org_unit` (
	`id` varchar(26) NOT NULL,
	`code` varchar(32) NOT NULL,
	`kind` varchar(16) NOT NULL,
	`name_en` varchar(160) NOT NULL,
	`name_hi` varchar(160),
	`slug` varchar(80) NOT NULL,
	`parent_id` varchar(26),
	`intro_en` text,
	`intro_hi` text,
	`sort_order` smallint NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`merged_into_id` varchar(26),
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `org_unit_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_unit_code_uq` UNIQUE(`code`),
	CONSTRAINT `org_unit_kind_slug_uq` UNIQUE(`kind`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `partner` (
	`id` varchar(26) NOT NULL,
	`name` varchar(160) NOT NULL,
	`kind` varchar(16) NOT NULL,
	`city` varchar(80) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partner_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seva_type` (
	`id` varchar(26) NOT NULL,
	`code` varchar(32) NOT NULL,
	`label_en` varchar(120) NOT NULL,
	`label_hi` varchar(120),
	`icon` varchar(48) NOT NULL,
	`wing` varchar(16) NOT NULL,
	`sort_order` smallint NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seva_type_id` PRIMARY KEY(`id`),
	CONSTRAINT `seva_type_code_uq` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` varchar(26) NOT NULL,
	`at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`actor_id` varchar(26),
	`actor_role` varchar(24),
	`action` varchar(64) NOT NULL,
	`entity` varchar(64) NOT NULL,
	`entity_id` varchar(64),
	`scope_id` varchar(26),
	`request_id` varchar(64),
	`ip_hash` varchar(64),
	`data` json,
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `privacy_request` (
	`id` varchar(26) NOT NULL,
	`name` varchar(120) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`type` varchar(16) NOT NULL,
	`details` text NOT NULL,
	`locale` varchar(2) NOT NULL DEFAULT 'en',
	`status` varchar(16) NOT NULL DEFAULT 'received',
	`due_at` datetime NOT NULL,
	`ip_hash` varchar(64),
	`handled_by` varchar(26),
	`closed_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `privacy_request_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `article_i18n` ADD CONSTRAINT `article_i18n_district_id_org_unit_id_fk` FOREIGN KEY (`district_id`) REFERENCES `org_unit`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `article_i18n` ADD CONSTRAINT `article_i18n_event_id_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event` ADD CONSTRAINT `event_seva_type_seva_type_code_fk` FOREIGN KEY (`seva_type`) REFERENCES `seva_type`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event` ADD CONSTRAINT `event_samithi_id_org_unit_id_fk` FOREIGN KEY (`samithi_id`) REFERENCES `org_unit`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event` ADD CONSTRAINT `event_district_id_org_unit_id_fk` FOREIGN KEY (`district_id`) REFERENCES `org_unit`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event` ADD CONSTRAINT `event_centre_id_centre_id_fk` FOREIGN KEY (`centre_id`) REFERENCES `centre`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event` ADD CONSTRAINT `event_partner_id_partner_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `partner`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event_timeline` ADD CONSTRAINT `event_timeline_event_id_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `impact_estimate` ADD CONSTRAINT `impact_estimate_org_unit_id_org_unit_id_fk` FOREIGN KEY (`org_unit_id`) REFERENCES `org_unit`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submission_answer_kpi` ADD CONSTRAINT `submission_answer_kpi_event_id_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `centre` ADD CONSTRAINT `centre_samithi_id_org_unit_id_fk` FOREIGN KEY (`samithi_id`) REFERENCES `org_unit`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `centre_gathering` ADD CONSTRAINT `centre_gathering_centre_id_centre_id_fk` FOREIGN KEY (`centre_id`) REFERENCES `centre`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `org_closure` ADD CONSTRAINT `org_closure_ancestor_id_org_unit_id_fk` FOREIGN KEY (`ancestor_id`) REFERENCES `org_unit`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `org_closure` ADD CONSTRAINT `org_closure_descendant_id_org_unit_id_fk` FOREIGN KEY (`descendant_id`) REFERENCES `org_unit`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `org_unit` ADD CONSTRAINT `org_unit_parent_id_org_unit_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `org_unit`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `article_i18n_event_idx` ON `article_i18n` (`event_id`);--> statement-breakpoint
CREATE INDEX `article_i18n_district_idx` ON `article_i18n` (`district_id`);--> statement-breakpoint
CREATE INDEX `content_item_kind_date_idx` ON `content_item` (`kind`,`date`);--> statement-breakpoint
CREATE INDEX `content_item_key_idx` ON `content_item` (`key`);--> statement-breakpoint
CREATE INDEX `event_status_starts_idx` ON `event` (`status`,`starts_at`);--> statement-breakpoint
CREATE INDEX `event_district_starts_idx` ON `event` (`district_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `event_samithi_starts_idx` ON `event` (`samithi_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `event_seva_type_idx` ON `event` (`seva_type`);--> statement-breakpoint
CREATE INDEX `event_timeline_event_idx` ON `event_timeline` (`event_id`,`at`);--> statement-breakpoint
CREATE INDEX `impact_estimate_month_idx` ON `impact_estimate` (`month`);--> statement-breakpoint
CREATE INDEX `impact_estimate_unit_idx` ON `impact_estimate` (`org_unit_id`);--> statement-breakpoint
CREATE INDEX `kpi_event_idx` ON `submission_answer_kpi` (`event_id`);--> statement-breakpoint
CREATE INDEX `kpi_key_idx` ON `submission_answer_kpi` (`kpi_key`,`dim`);--> statement-breakpoint
CREATE INDEX `kpi_submission_idx` ON `submission_answer_kpi` (`submission_id`);--> statement-breakpoint
CREATE INDEX `centre_samithi_idx` ON `centre` (`samithi_id`);--> statement-breakpoint
CREATE INDEX `centre_gathering_centre_idx` ON `centre_gathering` (`centre_id`);--> statement-breakpoint
CREATE INDEX `org_closure_desc_idx` ON `org_closure` (`descendant_id`);--> statement-breakpoint
CREATE INDEX `org_unit_parent_idx` ON `org_unit` (`parent_id`);--> statement-breakpoint
CREATE INDEX `audit_log_at_idx` ON `audit_log` (`at`);--> statement-breakpoint
CREATE INDEX `audit_log_entity_idx` ON `audit_log` (`entity`,`entity_id`);--> statement-breakpoint
CREATE INDEX `privacy_request_status_idx` ON `privacy_request` (`status`,`due_at`);