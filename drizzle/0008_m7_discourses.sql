CREATE TABLE `discourse` (
	`id` varchar(26) NOT NULL,
	`n` int NOT NULL,
	`slug` varchar(120) NOT NULL,
	`title_en` varchar(300) NOT NULL,
	`title_hi` varchar(300),
	`why_en` varchar(600) NOT NULL DEFAULT '',
	`why_hi` varchar(600),
	`coll_print` varchar(200) NOT NULL DEFAULT '',
	`coll_online` varchar(200),
	`date_text` varchar(80) NOT NULL DEFAULT '',
	`iso_date` date,
	`place` varchar(200) NOT NULL DEFAULT '',
	`occasion` varchar(300) NOT NULL DEFAULT '',
	`source_url` varchar(500),
	`pdf_url` varchar(500),
	`retrieved` date,
	`themes` json NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'not_started',
	`reviewer_id` varchar(26),
	`notes` json NOT NULL,
	`quotes` json NOT NULL,
	`published_at` timestamp,
	`published_snapshot` json,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discourse_id` PRIMARY KEY(`id`),
	CONSTRAINT `discourse_n_uq` UNIQUE(`n`),
	CONSTRAINT `discourse_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `discourse_block` (
	`id` varchar(26) NOT NULL,
	`discourse_id` varchar(26) NOT NULL,
	`block_id` varchar(32) NOT NULL,
	`idx` int NOT NULL,
	`type` varchar(12) NOT NULL,
	`en` longtext NOT NULL,
	`hi` longtext,
	`hi_ai` longtext,
	`status` varchar(12) NOT NULL DEFAULT 'empty',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discourse_block_id` PRIMARY KEY(`id`),
	CONSTRAINT `discourse_block_uq` UNIQUE(`discourse_id`,`block_id`)
);
--> statement-breakpoint
CREATE TABLE `discourse_glossary` (
	`term` varchar(120) NOT NULL,
	`hi` varchar(200) NOT NULL,
	`gloss` text,
	CONSTRAINT `discourse_glossary_term` PRIMARY KEY(`term`)
);
--> statement-breakpoint
ALTER TABLE `discourse` ADD CONSTRAINT `discourse_reviewer_id_app_user_id_fk` FOREIGN KEY (`reviewer_id`) REFERENCES `app_user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `discourse_block` ADD CONSTRAINT `discourse_block_discourse_id_discourse_id_fk` FOREIGN KEY (`discourse_id`) REFERENCES `discourse`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `discourse_status_idx` ON `discourse` (`status`);--> statement-breakpoint
CREATE INDEX `discourse_block_idx` ON `discourse_block` (`discourse_id`,`idx`);