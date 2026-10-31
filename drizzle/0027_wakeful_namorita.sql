CREATE TABLE `user_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` enum('order','admin','tier','coupon','point','review','inquiry','system') NOT NULL,
	`title` varchar(200) NOT NULL,
	`message` text NOT NULL,
	`link` varchar(500),
	`is_read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `un_user_id_idx` ON `user_notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `un_is_read_idx` ON `user_notifications` (`is_read`);--> statement-breakpoint
CREATE INDEX `un_created_at_idx` ON `user_notifications` (`created_at`);--> statement-breakpoint
CREATE INDEX `un_type_idx` ON `user_notifications` (`type`);