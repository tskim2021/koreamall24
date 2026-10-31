CREATE TABLE `product_related_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`related_product_id` int NOT NULL,
	`added_by` enum('ai','manual') NOT NULL DEFAULT 'manual',
	`sort_order` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_related_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `rp_product_id_idx` ON `product_related_products` (`product_id`);--> statement-breakpoint
CREATE INDEX `rp_related_product_id_idx` ON `product_related_products` (`related_product_id`);--> statement-breakpoint
CREATE INDEX `rp_unique_pair_idx` ON `product_related_products` (`product_id`,`related_product_id`);