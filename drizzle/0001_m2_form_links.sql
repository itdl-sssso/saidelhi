CREATE TABLE `attachment` (
	`id` varchar(26) NOT NULL,
	`event_id` varchar(26) NOT NULL,
	`link_id` varchar(26),
	`submission_id` varchar(26),
	`field_id` varchar(64),
	`path` varchar(255) NOT NULL,
	`original_name` varchar(255) NOT NULL,
	`mime` varchar(64) NOT NULL,
	`size` int NOT NULL,
	`sha256` char(64) NOT NULL,
	`uploaded_by_hash` char(64),
	`idempotency_key` varchar(100),
	`retention_until` datetime NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attachment_id` PRIMARY KEY(`id`),
	CONSTRAINT `attachment_idempotency_uq` UNIQUE(`link_id`,`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `consent_record` (
	`id` varchar(26) NOT NULL,
	`submission_id` varchar(26) NOT NULL,
	`event_id` varchar(26) NOT NULL,
	`subject_ref` varchar(80) NOT NULL,
	`purpose` varchar(32) NOT NULL,
	`statement` text NOT NULL,
	`method` varchar(16) NOT NULL DEFAULT 'form',
	`recorded_by_hash` char(64),
	`given_at` datetime NOT NULL,
	`withdrawn_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consent_record_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `form_link` (
	`id` varchar(26) NOT NULL,
	`token_hash` char(64) NOT NULL,
	`token_nonce` varchar(64) NOT NULL,
	`event_id` varchar(26) NOT NULL,
	`purpose` varchar(16) NOT NULL,
	`label` varchar(120) NOT NULL,
	`form_version_id` varchar(26) NOT NULL,
	`sent_to_kind` varchar(8),
	`sent_to_enc` varchar(160),
	`sent_to_hash` char(64),
	`sent_to_masked` varchar(24),
	`expires_at` datetime NOT NULL,
	`max_uses` int,
	`uses` int NOT NULL DEFAULT 0,
	`revoked_at` datetime,
	`otp_required` boolean NOT NULL DEFAULT true,
	`created_by` varchar(26),
	`last_opened_at` datetime,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `form_link_id` PRIMARY KEY(`id`),
	CONSTRAINT `form_link_token_hash_uq` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `form_template` (
	`id` varchar(26) NOT NULL,
	`code` varchar(64) NOT NULL,
	`seva_type` varchar(32),
	`purpose` varchar(16) NOT NULL,
	`title_en` varchar(200) NOT NULL,
	`title_hi` varchar(200),
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `form_template_id` PRIMARY KEY(`id`),
	CONSTRAINT `form_template_code_uq` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `form_version` (
	`id` varchar(26) NOT NULL,
	`template_id` varchar(26) NOT NULL,
	`version` int NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`definition` json NOT NULL,
	`published_at` datetime,
	`created_by` varchar(26),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `form_version_id` PRIMARY KEY(`id`),
	CONSTRAINT `form_version_template_version_uq` UNIQUE(`template_id`,`version`)
);
--> statement-breakpoint
CREATE TABLE `link_allowed_phone` (
	`id` varchar(26) NOT NULL,
	`event_id` varchar(26) NOT NULL,
	`phone_hash` char(64) NOT NULL,
	`phone_enc` varchar(160) NOT NULL,
	`phone_masked` varchar(24) NOT NULL,
	`label` varchar(120),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `link_allowed_phone_id` PRIMARY KEY(`id`),
	CONSTRAINT `link_allowed_phone_uq` UNIQUE(`event_id`,`phone_hash`)
);
--> statement-breakpoint
CREATE TABLE `link_session` (
	`id` char(64) NOT NULL,
	`link_id` varchar(26) NOT NULL,
	`phone_hash` char(64),
	`phone_masked` varchar(24),
	`expires_at` datetime NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `link_session_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `otp_challenge` (
	`id` varchar(26) NOT NULL,
	`phone_hash` char(64) NOT NULL,
	`purpose` varchar(8) NOT NULL,
	`link_id` varchar(26),
	`code_hash` char(64) NOT NULL,
	`attempts` smallint NOT NULL DEFAULT 0,
	`locked_until` datetime,
	`expires_at` datetime NOT NULL,
	`sent_at` datetime(3) NOT NULL,
	`consumed_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `otp_challenge_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submission` (
	`id` varchar(26) NOT NULL,
	`event_id` varchar(26) NOT NULL,
	`link_id` varchar(26),
	`session_id` char(64),
	`form_version_id` varchar(26) NOT NULL,
	`definition_version` int NOT NULL,
	`answers` json NOT NULL,
	`personal_answers` json,
	`submitted_by_hash` char(64),
	`submitted_by_masked` varchar(24) NOT NULL DEFAULT '',
	`source` varchar(16) NOT NULL DEFAULT 'form',
	`status` varchar(24) NOT NULL DEFAULT 'submitted',
	`idempotency_key` varchar(100),
	`version` int NOT NULL DEFAULT 1,
	`submitted_at` datetime(3) NOT NULL,
	`approved_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `submission_id` PRIMARY KEY(`id`),
	CONSTRAINT `submission_idempotency_uq` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
ALTER TABLE `event` ADD `form_version_id` varchar(26);--> statement-breakpoint
ALTER TABLE `attachment` ADD CONSTRAINT `attachment_event_id_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachment` ADD CONSTRAINT `attachment_link_id_form_link_id_fk` FOREIGN KEY (`link_id`) REFERENCES `form_link`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachment` ADD CONSTRAINT `attachment_submission_id_submission_id_fk` FOREIGN KEY (`submission_id`) REFERENCES `submission`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consent_record` ADD CONSTRAINT `consent_record_submission_id_submission_id_fk` FOREIGN KEY (`submission_id`) REFERENCES `submission`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consent_record` ADD CONSTRAINT `consent_record_event_id_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `form_link` ADD CONSTRAINT `form_link_event_id_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `form_link` ADD CONSTRAINT `form_link_form_version_id_form_version_id_fk` FOREIGN KEY (`form_version_id`) REFERENCES `form_version`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `form_version` ADD CONSTRAINT `form_version_template_id_form_template_id_fk` FOREIGN KEY (`template_id`) REFERENCES `form_template`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `link_allowed_phone` ADD CONSTRAINT `link_allowed_phone_event_id_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `link_session` ADD CONSTRAINT `link_session_link_id_form_link_id_fk` FOREIGN KEY (`link_id`) REFERENCES `form_link`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `otp_challenge` ADD CONSTRAINT `otp_challenge_link_id_form_link_id_fk` FOREIGN KEY (`link_id`) REFERENCES `form_link`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submission` ADD CONSTRAINT `submission_event_id_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submission` ADD CONSTRAINT `submission_link_id_form_link_id_fk` FOREIGN KEY (`link_id`) REFERENCES `form_link`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submission` ADD CONSTRAINT `submission_form_version_id_form_version_id_fk` FOREIGN KEY (`form_version_id`) REFERENCES `form_version`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `attachment_event_idx` ON `attachment` (`event_id`);--> statement-breakpoint
CREATE INDEX `attachment_submission_idx` ON `attachment` (`submission_id`);--> statement-breakpoint
CREATE INDEX `consent_record_submission_idx` ON `consent_record` (`submission_id`);--> statement-breakpoint
CREATE INDEX `form_link_event_idx` ON `form_link` (`event_id`,`purpose`);--> statement-breakpoint
CREATE INDEX `form_template_seva_idx` ON `form_template` (`seva_type`,`purpose`);--> statement-breakpoint
CREATE INDEX `link_session_link_idx` ON `link_session` (`link_id`);--> statement-breakpoint
CREATE INDEX `otp_challenge_lookup_idx` ON `otp_challenge` (`phone_hash`,`purpose`,`link_id`,`sent_at`);--> statement-breakpoint
CREATE INDEX `submission_event_idx` ON `submission` (`event_id`,`status`);--> statement-breakpoint
CREATE INDEX `submission_link_idx` ON `submission` (`link_id`);--> statement-breakpoint
ALTER TABLE `event` ADD CONSTRAINT `event_form_version_id_form_version_id_fk` FOREIGN KEY (`form_version_id`) REFERENCES `form_version`(`id`) ON DELETE no action ON UPDATE no action;