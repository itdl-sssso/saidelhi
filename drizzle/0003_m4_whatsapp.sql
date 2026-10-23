CREATE TABLE `inbox_history` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`item_id` varchar(26) NOT NULL,
	`action` varchar(16) NOT NULL,
	`by_role` varchar(24),
	`by_label` varchar(120) NOT NULL,
	`by_user_id` varchar(26),
	`note` text,
	`at` datetime(3) NOT NULL,
	CONSTRAINT `inbox_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inbox_item` (
	`id` varchar(26) NOT NULL,
	`source` varchar(12) NOT NULL,
	`sender_hash` char(64) NOT NULL,
	`sender_enc` varchar(160),
	`sender_masked` varchar(24) NOT NULL,
	`conversation_id` varchar(26),
	`scope_id` varchar(26),
	`district_id` varchar(26),
	`received_at` datetime NOT NULL,
	`state` varchar(12) NOT NULL DEFAULT 'for_me',
	`outcome` varchar(12),
	`event_id` varchar(26),
	`raw_kind` varchar(12) NOT NULL,
	`raw_text` text,
	`media_path` varchar(300),
	`media_name` varchar(200),
	`draft_answers` json NOT NULL,
	`field_confidence` json NOT NULL,
	`confidence` varchar(8) NOT NULL,
	`ai_model` varchar(64),
	`ai_drafted_at` datetime,
	`awaiting_reply` boolean NOT NULL DEFAULT false,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inbox_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reminder_rule` (
	`id` varchar(26) NOT NULL,
	`key` varchar(32) NOT NULL,
	`label_en` varchar(120) NOT NULL,
	`label_hi` varchar(120),
	`description_en` varchar(300) NOT NULL,
	`description_hi` varchar(300),
	`enabled` boolean NOT NULL DEFAULT true,
	`copy_district` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reminder_rule_id` PRIMARY KEY(`id`),
	CONSTRAINT `reminder_rule_key_uq` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_conversation` (
	`id` varchar(26) NOT NULL,
	`phone_hash` char(64) NOT NULL,
	`phone_enc` varchar(160) NOT NULL,
	`phone_masked` varchar(24) NOT NULL,
	`locale` varchar(2),
	`user_id` varchar(26),
	`flow` varchar(32),
	`state` json NOT NULL,
	`expires_at` datetime,
	`last_inbound_at` datetime,
	`last_at` datetime NOT NULL,
	`last_text` varchar(200) NOT NULL DEFAULT '',
	`message_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_conversation_id` PRIMARY KEY(`id`),
	CONSTRAINT `whatsapp_conversation_phone_uq` UNIQUE(`phone_hash`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_message` (
	`id` varchar(26) NOT NULL,
	`conversation_id` varchar(26),
	`phone_hash` char(64) NOT NULL,
	`phone_masked` varchar(24) NOT NULL,
	`dir` varchar(3) NOT NULL,
	`kind` varchar(16) NOT NULL,
	`text` text,
	`payload` json,
	`template` varchar(64),
	`provider_id` varchar(96),
	`status` varchar(12) NOT NULL DEFAULT 'sent',
	`cost_paise` int NOT NULL DEFAULT 0,
	`inbox_item_id` varchar(26),
	`media_path` varchar(300),
	`media_name` varchar(200),
	`media_mime` varchar(80),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsapp_message_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_optin` (
	`id` varchar(26) NOT NULL,
	`phone_hash` char(64) NOT NULL,
	`phone_enc` varchar(160) NOT NULL,
	`phone_masked` varchar(24) NOT NULL,
	`district_id` varchar(26),
	`seva_types` json NOT NULL,
	`locale` varchar(2) NOT NULL DEFAULT 'en',
	`status` varchar(10) NOT NULL DEFAULT 'pending',
	`via` varchar(12) NOT NULL DEFAULT 'web',
	`requested_at` datetime NOT NULL,
	`consent_at` datetime,
	`stopped_at` datetime,
	`ip_hash` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_optin_id` PRIMARY KEY(`id`),
	CONSTRAINT `whatsapp_optin_phone_uq` UNIQUE(`phone_hash`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_template` (
	`id` varchar(26) NOT NULL,
	`name` varchar(64) NOT NULL,
	`category` varchar(16) NOT NULL,
	`text_en` text NOT NULL,
	`text_hi` text,
	`meta_status` varchar(16) NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_template_id` PRIMARY KEY(`id`),
	CONSTRAINT `whatsapp_template_name_uq` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `inbox_history` ADD CONSTRAINT `inbox_history_item_id_inbox_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `inbox_item`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `inbox_history_item_idx` ON `inbox_history` (`item_id`,`at`);--> statement-breakpoint
CREATE INDEX `inbox_item_state_idx` ON `inbox_item` (`state`,`received_at`);--> statement-breakpoint
CREATE INDEX `inbox_item_sender_idx` ON `inbox_item` (`sender_hash`);--> statement-breakpoint
CREATE INDEX `whatsapp_conversation_last_idx` ON `whatsapp_conversation` (`last_at`);--> statement-breakpoint
CREATE INDEX `whatsapp_message_conv_idx` ON `whatsapp_message` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `whatsapp_message_phone_idx` ON `whatsapp_message` (`phone_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `whatsapp_message_inbox_idx` ON `whatsapp_message` (`inbox_item_id`);--> statement-breakpoint
CREATE INDEX `whatsapp_optin_status_idx` ON `whatsapp_optin` (`status`,`district_id`);