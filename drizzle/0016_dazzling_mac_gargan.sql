CREATE TABLE `login_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`loginAt` timestamp NOT NULL DEFAULT (now()),
	`ipAddress` varchar(45),
	`userAgent` text,
	`device` varchar(20),
	`browser` varchar(50),
	`country` varchar(50),
	CONSTRAINT `login_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `membership_tiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`nameKo` varchar(50) NOT NULL,
	`minAmount` int NOT NULL DEFAULT 0,
	`discountRate` decimal(5,2) NOT NULL DEFAULT '0',
	`pointRate` decimal(5,2) NOT NULL DEFAULT '1',
	`color` varchar(20) NOT NULL DEFAULT '#6B7280',
	`icon` varchar(50) NOT NULL DEFAULT 'Star',
	`sortOrder` int NOT NULL DEFAULT 0,
	`periodMonths` int NOT NULL DEFAULT 6,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `membership_tiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referral_rewards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerId` int NOT NULL,
	`refereeId` int NOT NULL,
	`rewardType` enum('signup','first_purchase') NOT NULL,
	`referrerReward` int NOT NULL DEFAULT 0,
	`refereeReward` int NOT NULL DEFAULT 0,
	`status` enum('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referral_rewards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referral_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`signupReferrerReward` int NOT NULL DEFAULT 500,
	`signupRefereeReward` int NOT NULL DEFAULT 500,
	`purchaseReferrerReward` int NOT NULL DEFAULT 1000,
	`purchaseRefereeReward` int NOT NULL DEFAULT 1000,
	`isActive` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referral_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `registered_users` ADD `membershipTierId` int;--> statement-breakpoint
ALTER TABLE `registered_users` ADD `totalPurchaseAmount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `registered_users` ADD `tierUpdatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `registered_users` ADD `referralCode` varchar(20);--> statement-breakpoint
ALTER TABLE `registered_users` ADD `referredBy` int;--> statement-breakpoint
ALTER TABLE `registered_users` ADD `referralRewardClaimed` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `login_user_id_idx` ON `login_history` (`userId`);--> statement-breakpoint
CREATE INDEX `login_at_idx` ON `login_history` (`loginAt`);--> statement-breakpoint
CREATE INDEX `referral_referrer_idx` ON `referral_rewards` (`referrerId`);--> statement-breakpoint
CREATE INDEX `referral_referee_idx` ON `referral_rewards` (`refereeId`);--> statement-breakpoint
CREATE INDEX `referral_status_idx` ON `referral_rewards` (`status`);