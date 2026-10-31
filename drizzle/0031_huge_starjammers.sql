ALTER TABLE `orders` MODIFY COLUMN `status` enum('pending','paid','confirmed','processing','shipped','delivered','completed','cancelled','partially_cancelled') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `orders` ADD `pointsAdded` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `completedAt` timestamp;