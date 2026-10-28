CREATE TABLE `gallery_album` (
	`id` varchar(120) NOT NULL,
	`k1` varchar(120),
	`k2` varchar(120),
	`version` int NOT NULL DEFAULT 1,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gallery_album_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gallery_photo` (
	`id` varchar(120) NOT NULL,
	`k1` varchar(120),
	`k2` varchar(120),
	`version` int NOT NULL DEFAULT 1,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gallery_photo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `gallery_album_k1_idx` ON `gallery_album` (`k1`,`k2`);--> statement-breakpoint
CREATE INDEX `gallery_photo_k1_idx` ON `gallery_photo` (`k1`,`k2`);