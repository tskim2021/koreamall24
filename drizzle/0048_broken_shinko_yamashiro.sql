CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` varchar(100) NOT NULL,
	`user_id` int,
	`event_type` varchar(50) NOT NULL,
	`event_name` varchar(100),
	`event_value` varchar(500),
	`page` varchar(255),
	`metadata` json,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analytics_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` varchar(100) NOT NULL,
	`user_id` int,
	`ip_address` varchar(45),
	`country` varchar(2),
	`country_name` varchar(100),
	`device_type` varchar(20),
	`browser` varchar(100),
	`os` varchar(100),
	`page_view_count` int NOT NULL DEFAULT 1,
	`event_count` int NOT NULL DEFAULT 0,
	`last_search_keyword` varchar(255),
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`last_activity_at` timestamp NOT NULL DEFAULT (now()),
	`ended_at` timestamp,
	`duration` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `analytics_sessions_session_id_unique` UNIQUE(`session_id`)
);
--> statement-breakpoint
CREATE TABLE `country_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`country` varchar(2) NOT NULL,
	`country_name` varchar(100),
	`sessions` int NOT NULL DEFAULT 0,
	`page_views` int NOT NULL DEFAULT 0,
	`unique_visitors` int NOT NULL DEFAULT 0,
	`purchases` int NOT NULL DEFAULT 0,
	`revenue` decimal(12,2) NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `country_stats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`total_sessions` int NOT NULL DEFAULT 0,
	`total_page_views` int NOT NULL DEFAULT 0,
	`total_events` int NOT NULL DEFAULT 0,
	`unique_visitors` int NOT NULL DEFAULT 0,
	`total_purchases` int NOT NULL DEFAULT 0,
	`total_revenue` decimal(12,2) NOT NULL DEFAULT 0,
	`avg_session_duration` decimal(10,2),
	`bounce_rate` decimal(5,2),
	`top_page` varchar(255),
	`top_search_keyword` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_stats_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_stats_date_unique` UNIQUE(`date`)
);
--> statement-breakpoint
CREATE TABLE `page_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` varchar(100) NOT NULL,
	`user_id` int,
	`page` varchar(255) NOT NULL,
	`referrer` varchar(500),
	`user_agent` text,
	`ip_address` varchar(45),
	`country` varchar(2),
	`country_name` varchar(100),
	`region` varchar(100),
	`city` varchar(100),
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`device_type` varchar(20),
	`browser` varchar(100),
	`os` varchar(100),
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `page_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `search_keywords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`keyword` varchar(255) NOT NULL,
	`count` int NOT NULL DEFAULT 1,
	`date` varchar(10) NOT NULL,
	`conversions` int NOT NULL DEFAULT 0,
	`revenue` decimal(12,2) NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `search_keywords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ae_session_id_idx` ON `analytics_events` (`session_id`);--> statement-breakpoint
CREATE INDEX `ae_user_id_idx` ON `analytics_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `ae_event_type_idx` ON `analytics_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `ae_timestamp_idx` ON `analytics_events` (`timestamp`);--> statement-breakpoint
CREATE INDEX `ae_created_at_idx` ON `analytics_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `as_session_id_idx` ON `analytics_sessions` (`session_id`);--> statement-breakpoint
CREATE INDEX `as_user_id_idx` ON `analytics_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `as_country_idx` ON `analytics_sessions` (`country`);--> statement-breakpoint
CREATE INDEX `as_started_at_idx` ON `analytics_sessions` (`started_at`);--> statement-breakpoint
CREATE INDEX `as_created_at_idx` ON `analytics_sessions` (`created_at`);--> statement-breakpoint
CREATE INDEX `cs_date_country_idx` ON `country_stats` (`date`,`country`);--> statement-breakpoint
CREATE INDEX `cs_date_idx` ON `country_stats` (`date`);--> statement-breakpoint
CREATE INDEX `cs_country_idx` ON `country_stats` (`country`);--> statement-breakpoint
CREATE INDEX `ds_date_idx` ON `daily_stats` (`date`);--> statement-breakpoint
CREATE INDEX `pv_session_id_idx` ON `page_views` (`session_id`);--> statement-breakpoint
CREATE INDEX `pv_user_id_idx` ON `page_views` (`user_id`);--> statement-breakpoint
CREATE INDEX `pv_page_idx` ON `page_views` (`page`);--> statement-breakpoint
CREATE INDEX `pv_country_idx` ON `page_views` (`country`);--> statement-breakpoint
CREATE INDEX `pv_timestamp_idx` ON `page_views` (`timestamp`);--> statement-breakpoint
CREATE INDEX `pv_created_at_idx` ON `page_views` (`created_at`);--> statement-breakpoint
CREATE INDEX `sk_keyword_date_idx` ON `search_keywords` (`keyword`,`date`);--> statement-breakpoint
CREATE INDEX `sk_date_idx` ON `search_keywords` (`date`);--> statement-breakpoint
CREATE INDEX `sk_keyword_idx` ON `search_keywords` (`keyword`);