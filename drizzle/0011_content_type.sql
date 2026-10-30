CREATE TABLE `content_type` (
	`id` varchar(120) NOT NULL,
	`k1` varchar(120),
	`k2` varchar(120),
	`version` int NOT NULL DEFAULT 1,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_type_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `content_type_k1_idx` ON `content_type` (`k1`,`k2`);