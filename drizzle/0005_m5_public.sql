CREATE TABLE `redirect` (
	`from_path` varchar(500) NOT NULL,
	`to_path` varchar(500) NOT NULL,
	`permanent` boolean NOT NULL DEFAULT true,
	`source` enum('rule','manual','migration') NOT NULL DEFAULT 'manual',
	`hits` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `redirect_from_path` PRIMARY KEY(`from_path`)
);
