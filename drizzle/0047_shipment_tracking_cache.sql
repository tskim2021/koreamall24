CREATE TABLE `shipment_tracking_cache` (
`id` int AUTO_INCREMENT NOT NULL,
`tracking_number` varchar(50) NOT NULL,
`carrier` varchar(50) NOT NULL DEFAULT 'Japan Post',
`events_json` text,
`status` varchar(50),
`current_location` varchar(255),
`has_alert` boolean NOT NULL DEFAULT false,
`alert_type` varchar(100),
`alert_description` text,
`alert_notified_at` timestamp,
`last_synced_at` timestamp NOT NULL DEFAULT (now()),
`sync_error` text,
`created_at` timestamp NOT NULL DEFAULT (now()),
`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
CONSTRAINT `shipment_tracking_cache_id` PRIMARY KEY(`id`),
CONSTRAINT `shipment_tracking_cache_tracking_number_unique` UNIQUE(`tracking_number`)
);
CREATE INDEX `stc_tracking_number_idx` ON `shipment_tracking_cache` (`tracking_number`);
CREATE INDEX `stc_has_alert_idx` ON `shipment_tracking_cache` (`has_alert`);
CREATE INDEX `stc_last_synced_at_idx` ON `shipment_tracking_cache` (`last_synced_at`);
