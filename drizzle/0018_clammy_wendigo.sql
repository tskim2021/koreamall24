CREATE TABLE `tier_change_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`previousTierId` int,
	`newTierId` int NOT NULL,
	`changedBy` int,
	`changeType` varchar(20) NOT NULL DEFAULT 'manual',
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tier_change_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `tch_user_id_idx` ON `tier_change_history` (`userId`);--> statement-breakpoint
CREATE INDEX `tch_created_at_idx` ON `tier_change_history` (`createdAt`);