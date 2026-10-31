CREATE TABLE `email_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email_type` varchar(100) NOT NULL,
	`to` varchar(255) NOT NULL,
	`subject` varchar(500) NOT NULL,
	`status` enum('sent','failed','skipped') NOT NULL DEFAULT 'sent',
	`error_message` text,
	`user_id` int,
	`order_id` int,
	`metadata` text,
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `email_type_idx` ON `email_logs` (`email_type`);--> statement-breakpoint
CREATE INDEX `email_to_idx` ON `email_logs` (`to`);--> statement-breakpoint
CREATE INDEX `email_user_id_idx` ON `email_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `email_sent_at_idx` ON `email_logs` (`sent_at`);