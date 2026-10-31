CREATE TABLE `email_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_key` varchar(100) NOT NULL,
	`template_name` varchar(255) NOT NULL,
	`subject` text NOT NULL,
	`body_text` text NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_templates_template_key_unique` UNIQUE(`template_key`)
);
--> statement-breakpoint
CREATE INDEX `et_template_key_idx` ON `email_templates` (`template_key`);--> statement-breakpoint
CREATE INDEX `et_is_active_idx` ON `email_templates` (`is_active`);