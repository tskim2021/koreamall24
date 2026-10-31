ALTER TABLE `registered_users` MODIFY COLUMN `gender` enum('male','female','no_answer');--> statement-breakpoint
ALTER TABLE `registered_users` ADD `lastNameKanji` varchar(50);--> statement-breakpoint
ALTER TABLE `registered_users` ADD `firstNameKanji` varchar(50);--> statement-breakpoint
ALTER TABLE `registered_users` ADD `lastNameKatakana` varchar(50);--> statement-breakpoint
ALTER TABLE `registered_users` ADD `firstNameKatakana` varchar(50);