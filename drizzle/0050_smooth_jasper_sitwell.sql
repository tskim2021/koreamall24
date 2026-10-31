ALTER TABLE `country_stats` MODIFY COLUMN `revenue` decimal(12,2) NOT NULL DEFAULT '0';--> statement-breakpoint
ALTER TABLE `daily_stats` MODIFY COLUMN `total_revenue` decimal(12,2) NOT NULL DEFAULT '0';--> statement-breakpoint
ALTER TABLE `search_keywords` MODIFY COLUMN `revenue` decimal(12,2) NOT NULL DEFAULT '0';