CREATE TABLE `discourse_media` (
	`id` varchar(26) NOT NULL,
	`discourse_id` varchar(26) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`provider` varchar(12) NOT NULL,
	`url` varchar(500) NOT NULL,
	`external_id` varchar(40),
	`title` varchar(300) NOT NULL DEFAULT '',
	`channel` varchar(200),
	`duration_s` int,
	`recorded_date` date,
	`official` boolean NOT NULL DEFAULT false,
	`confidence` varchar(8),
	`score` int,
	`source_page` varchar(500),
	`approved` boolean NOT NULL DEFAULT false,
	`sort` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discourse_media_id` PRIMARY KEY(`id`),
	CONSTRAINT `discourse_media_uq` UNIQUE(`discourse_id`,`url`)
);
--> statement-breakpoint
ALTER TABLE `discourse_media` ADD CONSTRAINT `discourse_media_discourse_id_discourse_id_fk` FOREIGN KEY (`discourse_id`) REFERENCES `discourse`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `discourse_media_idx` ON `discourse_media` (`discourse_id`,`sort`);