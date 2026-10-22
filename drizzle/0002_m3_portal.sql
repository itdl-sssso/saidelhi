CREATE TABLE `app_user` (
	`id` varchar(26) NOT NULL,
	`name` varchar(120) NOT NULL,
	`phone_enc` varchar(160) NOT NULL,
	`phone_hash` char(64) NOT NULL,
	`phone_masked` varchar(24) NOT NULL,
	`email` varchar(254),
	`locale` varchar(2) NOT NULL DEFAULT 'en',
	`status` varchar(16) NOT NULL DEFAULT 'invited',
	`last_sign_in_at` datetime,
	`invited_by` varchar(26),
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_user_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_user_phone_hash_uq` UNIQUE(`phone_hash`)
);
--> statement-breakpoint
CREATE TABLE `approval` (
	`id` varchar(26) NOT NULL,
	`event_id` varchar(26) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`state` varchar(24) NOT NULL DEFAULT 'pending',
	`requested_at` datetime(3) NOT NULL,
	`requested_by` varchar(26),
	`requested_by_label` varchar(120),
	`request_channel` varchar(16),
	`decided_by` varchar(26),
	`decided_at` datetime,
	`channel` varchar(16),
	`reason` text,
	`escalated_at` datetime,
	`self_approved` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `approval_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_log` (
	`id` varchar(26) NOT NULL,
	`key` varchar(160) NOT NULL,
	`kind` varchar(32) NOT NULL,
	`event_id` varchar(26),
	`sent_at` datetime(3) NOT NULL,
	CONSTRAINT `notification_log_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_log_key_uq` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` char(64) NOT NULL,
	`user_id` varchar(26) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`last_seen_at` datetime NOT NULL,
	`expires_at` datetime NOT NULL,
	`revoked_at` datetime,
	`ip_hash` varchar(64),
	`ua_hint` varchar(160),
	CONSTRAINT `session_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `role_assignment` (
	`id` varchar(26) NOT NULL,
	`user_id` varchar(26) NOT NULL,
	`role` varchar(24) NOT NULL,
	`scope_id` varchar(26),
	`created_by` varchar(26),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`ended_at` datetime,
	CONSTRAINT `role_assignment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `event` ADD `approval_requested_at` datetime;--> statement-breakpoint
ALTER TABLE `event` ADD `escalated_at` datetime;--> statement-breakpoint
ALTER TABLE `event` ADD `escalated_from` varchar(24);--> statement-breakpoint
ALTER TABLE `event` ADD `self_approved` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `approval` ADD CONSTRAINT `approval_event_id_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_app_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `app_user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_assignment` ADD CONSTRAINT `role_assignment_user_id_app_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `app_user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_assignment` ADD CONSTRAINT `role_assignment_scope_id_org_unit_id_fk` FOREIGN KEY (`scope_id`) REFERENCES `org_unit`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `app_user_status_idx` ON `app_user` (`status`);--> statement-breakpoint
CREATE INDEX `approval_state_idx` ON `approval` (`state`,`requested_at`);--> statement-breakpoint
CREATE INDEX `approval_event_idx` ON `approval` (`event_id`,`kind`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_expires_idx` ON `session` (`expires_at`);--> statement-breakpoint
CREATE INDEX `role_assignment_user_idx` ON `role_assignment` (`user_id`,`ended_at`);--> statement-breakpoint
CREATE INDEX `role_assignment_scope_idx` ON `role_assignment` (`scope_id`);--> statement-breakpoint
CREATE INDEX `audit_log_actor_idx` ON `audit_log` (`actor_id`,`at`);