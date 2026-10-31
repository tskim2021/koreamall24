CREATE TABLE `mainBanners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`imageUrl` varchar(1000) NOT NULL,
	`linkUrl` varchar(500) NOT NULL DEFAULT '/',
	`altText` varchar(255) NOT NULL DEFAULT '',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mainBanners_id` PRIMARY KEY(`id`)
);
