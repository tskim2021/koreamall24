CREATE TABLE `product_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`product_name` varchar(500) NOT NULL,
	`admin_id` int NOT NULL,
	`admin_name` varchar(255) NOT NULL,
	`action` varchar(50) NOT NULL,
	`changed_fields` text,
	`old_values` text,
	`new_values` text,
	`note` varchar(1000),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `registered_users` MODIFY COLUMN `points` int NOT NULL DEFAULT 0;--> statement-breakpoint
CREATE INDEX `pal_product_id_idx` ON `product_audit_logs` (`product_id`);--> statement-breakpoint
CREATE INDEX `pal_admin_id_idx` ON `product_audit_logs` (`admin_id`);--> statement-breakpoint
CREATE INDEX `pal_created_at_idx` ON `product_audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `pal_action_idx` ON `product_audit_logs` (`action`);