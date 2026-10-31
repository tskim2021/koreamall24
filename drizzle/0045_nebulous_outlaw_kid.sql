CREATE INDEX `pio_product_id_idx` ON `product_image_order` (`productId`);--> statement-breakpoint
CREATE INDEX `pio_thumbnail_idx` ON `product_image_order` (`productId`,`isThumbnail`);--> statement-breakpoint
CREATE INDEX `prod_is_hit_idx` ON `products` (`isHit`);--> statement-breakpoint
CREATE INDEX `prod_is_recommended_idx` ON `products` (`isRecommended`);--> statement-breakpoint
CREATE INDEX `prod_is_new_idx` ON `products` (`isNew`);--> statement-breakpoint
CREATE INDEX `prod_is_visible_idx` ON `products` (`isVisible`);--> statement-breakpoint
CREATE INDEX `prod_view_count_idx` ON `products` (`viewCount`);