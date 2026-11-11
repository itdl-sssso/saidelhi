CREATE TABLE `video` (
	`id` varchar(120) NOT NULL,
	`k1` varchar(120),
	`k2` varchar(120),
	`version` int NOT NULL DEFAULT 1,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `video_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `article_i18n` MODIFY COLUMN `video_id` varchar(40);--> statement-breakpoint
CREATE INDEX `video_k1_idx` ON `video` (`k1`,`k2`);