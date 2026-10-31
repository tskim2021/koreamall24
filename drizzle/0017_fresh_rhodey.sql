ALTER TABLE `orders` ADD `membershipDiscount` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `membershipTierName` varchar(50);