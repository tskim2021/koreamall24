CREATE TABLE `settingAuditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(100) NOT NULL,
	`previousValue` text,
	`newValue` text,
	`changedBy` int NOT NULL,
	`changedByName` varchar(100),
	`changeNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `settingAuditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `audit_setting_key_idx` ON `settingAuditLogs` (`settingKey`);--> statement-breakpoint
CREATE INDEX `audit_changed_by_idx` ON `settingAuditLogs` (`changedBy`);--> statement-breakpoint
CREATE INDEX `audit_created_at_idx` ON `settingAuditLogs` (`createdAt`);