ALTER TABLE `registered_users` ADD `isWithdrawn` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `registered_users` ADD `withdrawnAt` timestamp;
