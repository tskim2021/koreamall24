ALTER TABLE `order_items` ADD `itemTrackingNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `order_items` ADD `itemCarrier` varchar(50);--> statement-breakpoint
ALTER TABLE `order_items` ADD `itemShippedAt` timestamp;--> statement-breakpoint
ALTER TABLE `order_items` ADD `itemDeliveredAt` timestamp;