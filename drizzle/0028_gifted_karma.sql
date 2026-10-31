CREATE TABLE `notification_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`message` text NOT NULL,
	`link` varchar(500),
	`type` enum('order','admin','tier','coupon','point','review','inquiry','system') NOT NULL DEFAULT 'admin',
	`target_type` enum('all','segment','individual') NOT NULL DEFAULT 'all',
	`target_user_ids` text,
	`target_segment` varchar(100),
	`scheduled_at` timestamp NOT NULL,
	`status` enum('pending','sent','cancelled','failed') NOT NULL DEFAULT 'pending',
	`sent_count` int NOT NULL DEFAULT 0,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_type` varchar(100) NOT NULL,
	`label` varchar(200) NOT NULL,
	`is_enabled` boolean NOT NULL DEFAULT true,
	`default_title` varchar(200),
	`default_message` text,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_settings_event_type_unique` UNIQUE(`event_type`)
);
--> statement-breakpoint
CREATE TABLE `notification_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`type` enum('order','admin','tier','coupon','point','review','inquiry','system') NOT NULL,
	`title` varchar(200) NOT NULL,
	`message` text NOT NULL,
	`link` varchar(500),
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`order_enabled` boolean NOT NULL DEFAULT true,
	`tier_enabled` boolean NOT NULL DEFAULT true,
	`coupon_enabled` boolean NOT NULL DEFAULT true,
	`point_enabled` boolean NOT NULL DEFAULT true,
	`review_enabled` boolean NOT NULL DEFAULT true,
	`inquiry_enabled` boolean NOT NULL DEFAULT true,
	`admin_enabled` boolean NOT NULL DEFAULT true,
	`system_enabled` boolean NOT NULL DEFAULT true,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_notification_preferences_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE INDEX `ns_status_idx` ON `notification_schedules` (`status`);--> statement-breakpoint
CREATE INDEX `ns_scheduled_at_idx` ON `notification_schedules` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `unp_user_id_idx` ON `user_notification_preferences` (`user_id`);