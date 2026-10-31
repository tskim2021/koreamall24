CREATE TABLE `email_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`order_confirmation` boolean NOT NULL DEFAULT true,
	`order_shipped` boolean NOT NULL DEFAULT true,
	`order_delivered` boolean NOT NULL DEFAULT true,
	`order_cancelled` boolean NOT NULL DEFAULT true,
	`refund_processed` boolean NOT NULL DEFAULT true,
	`password_changed` boolean NOT NULL DEFAULT true,
	`marketing_emails` boolean NOT NULL DEFAULT true,
	`event_notifications` boolean NOT NULL DEFAULT true,
	`coupon_notifications` boolean NOT NULL DEFAULT true,
	`point_notifications` boolean NOT NULL DEFAULT true,
	`review_reminders` boolean NOT NULL DEFAULT true,
	`inquiry_replies` boolean NOT NULL DEFAULT true,
	`product_qa_replies` boolean NOT NULL DEFAULT true,
	`newsletter` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_preferences_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE INDEX `ep_user_id_idx` ON `email_preferences` (`user_id`);