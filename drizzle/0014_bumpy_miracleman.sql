ALTER TABLE `products` ADD `isHit` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `isRecommended` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `isNew` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `isDiscount` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `sortOrder` int DEFAULT 0 NOT NULL;