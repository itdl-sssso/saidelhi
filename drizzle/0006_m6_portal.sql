CREATE TABLE `article` (
	`id` varchar(120) NOT NULL,
	`k1` varchar(120),
	`k2` varchar(120),
	`version` int NOT NULL DEFAULT 1,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `article_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `breach` (
	`id` varchar(120) NOT NULL,
	`k1` varchar(120),
	`k2` varchar(120),
	`version` int NOT NULL DEFAULT 1,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `breach_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `export_log` (
	`id` varchar(120) NOT NULL,
	`k1` varchar(120),
	`k2` varchar(120),
	`version` int NOT NULL DEFAULT 1,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `export_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `followup_log` (
	`id` varchar(120) NOT NULL,
	`k1` varchar(120),
	`k2` varchar(120),
	`version` int NOT NULL DEFAULT 1,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `followup_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `followup_person` (
	`id` varchar(120) NOT NULL,
	`k1` varchar(120),
	`k2` varchar(120),
	`version` int NOT NULL DEFAULT 1,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `followup_person_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `form_change_request` (
	`id` varchar(120) NOT NULL,
	`k1` varchar(120),
	`k2` varchar(120),
	`version` int NOT NULL DEFAULT 1,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `form_change_request_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kpi_definition` (
	`id` varchar(120) NOT NULL,
	`k1` varchar(120),
	`k2` varchar(120),
	`version` int NOT NULL DEFAULT 1,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kpi_definition_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `migration_run` (
	`id` varchar(120) NOT NULL,
	`k1` varchar(120),
	`k2` varchar(120),
	`version` int NOT NULL DEFAULT 1,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `migration_run_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthly_report` (
	`id` varchar(120) NOT NULL,
	`k1` varchar(120),
	`k2` varchar(120),
	`version` int NOT NULL DEFAULT 1,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthly_report_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `report_schedule` (
	`id` varchar(120) NOT NULL,
	`k1` varchar(120),
	`k2` varchar(120),
	`version` int NOT NULL DEFAULT 1,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `report_schedule_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `retention_run` (
	`id` varchar(120) NOT NULL,
	`k1` varchar(120),
	`k2` varchar(120),
	`version` int NOT NULL DEFAULT 1,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `retention_run_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ui_string` (
	`id` varchar(120) NOT NULL,
	`k1` varchar(120),
	`k2` varchar(120),
	`version` int NOT NULL DEFAULT 1,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ui_string_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `upload_batch` (
	`id` varchar(120) NOT NULL,
	`k1` varchar(120),
	`k2` varchar(120),
	`version` int NOT NULL DEFAULT 1,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `upload_batch_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `upload_row` (
	`id` varchar(120) NOT NULL,
	`k1` varchar(120),
	`k2` varchar(120),
	`version` int NOT NULL DEFAULT 1,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `upload_row_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_pref` (
	`id` varchar(120) NOT NULL,
	`k1` varchar(120),
	`k2` varchar(120),
	`version` int NOT NULL DEFAULT 1,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_pref_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `impact_estimate` ADD `period` varchar(8) DEFAULT 'month' NOT NULL;--> statement-breakpoint
ALTER TABLE `partner` ADD `name_hi` varchar(160);--> statement-breakpoint
ALTER TABLE `partner` ADD `contact` varchar(300);--> statement-breakpoint
ALTER TABLE `partner` ADD `show_publicly` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `partner` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `seva_type` ADD `template_id` varchar(26);--> statement-breakpoint
ALTER TABLE `seva_type` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `privacy_request` ADD `assignee_id` varchar(26);--> statement-breakpoint
ALTER TABLE `privacy_request` ADD `steps` json DEFAULT ('[]') NOT NULL;--> statement-breakpoint
ALTER TABLE `privacy_request` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `article_k1_idx` ON `article` (`k1`,`k2`);--> statement-breakpoint
CREATE INDEX `breach_k1_idx` ON `breach` (`k1`,`k2`);--> statement-breakpoint
CREATE INDEX `export_log_k1_idx` ON `export_log` (`k1`,`k2`);--> statement-breakpoint
CREATE INDEX `followup_log_k1_idx` ON `followup_log` (`k1`,`k2`);--> statement-breakpoint
CREATE INDEX `followup_person_k1_idx` ON `followup_person` (`k1`,`k2`);--> statement-breakpoint
CREATE INDEX `form_change_request_k1_idx` ON `form_change_request` (`k1`,`k2`);--> statement-breakpoint
CREATE INDEX `kpi_definition_k1_idx` ON `kpi_definition` (`k1`,`k2`);--> statement-breakpoint
CREATE INDEX `migration_run_k1_idx` ON `migration_run` (`k1`,`k2`);--> statement-breakpoint
CREATE INDEX `monthly_report_k1_idx` ON `monthly_report` (`k1`,`k2`);--> statement-breakpoint
CREATE INDEX `report_schedule_k1_idx` ON `report_schedule` (`k1`,`k2`);--> statement-breakpoint
CREATE INDEX `retention_run_k1_idx` ON `retention_run` (`k1`,`k2`);--> statement-breakpoint
CREATE INDEX `ui_string_k1_idx` ON `ui_string` (`k1`,`k2`);--> statement-breakpoint
CREATE INDEX `upload_batch_k1_idx` ON `upload_batch` (`k1`,`k2`);--> statement-breakpoint
CREATE INDEX `upload_row_k1_idx` ON `upload_row` (`k1`,`k2`);--> statement-breakpoint
CREATE INDEX `user_pref_k1_idx` ON `user_pref` (`k1`,`k2`);