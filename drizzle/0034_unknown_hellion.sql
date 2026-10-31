ALTER TABLE `orders` ADD `cartGroupId` varchar(20);--> statement-breakpoint
CREATE INDEX `ord_cart_group_idx` ON `orders` (`cartGroupId`);