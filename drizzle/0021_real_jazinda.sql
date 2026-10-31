CREATE TABLE `bulk_email_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`subject` varchar(300) NOT NULL,
	`preview_text` varchar(200),
	`sender_name` varchar(100) NOT NULL DEFAULT 'ококくすり',
	`sender_email` varchar(200) NOT NULL DEFAULT 'noreply@cocokusuri.com',
	`target_segment` enum('all','marketing','newsletter','active','inactive','vip','custom') NOT NULL DEFAULT 'marketing',
	`custom_emails` text,
	`content_type` enum('html','text') NOT NULL DEFAULT 'html',
	`html_content` longtext,
	`text_content` text,
	`brevo_template_id` int,
	`brevo_campaign_id` int,
	`status` enum('draft','scheduled','sending','sent','failed','cancelled') NOT NULL DEFAULT 'draft',
	`scheduled_at` timestamp,
	`sent_at` timestamp,
	`recipient_count` int NOT NULL DEFAULT 0,
	`sent_count` int NOT NULL DEFAULT 0,
	`failed_count` int NOT NULL DEFAULT 0,
	`open_count` int NOT NULL DEFAULT 0,
	`click_count` int NOT NULL DEFAULT 0,
	`created_by` int,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bulk_email_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `bec_status_idx` ON `bulk_email_campaigns` (`status`);--> statement-breakpoint
CREATE INDEX `bec_created_at_idx` ON `bulk_email_campaigns` (`created_at`);--> statement-breakpoint
CREATE INDEX `bec_scheduled_at_idx` ON `bulk_email_campaigns` (`scheduled_at`);