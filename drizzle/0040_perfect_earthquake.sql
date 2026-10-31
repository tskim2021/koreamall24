ALTER TABLE `inquiry_comments` ADD `isAiGenerated` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiry_comments` ADD `needsReview` boolean DEFAULT false NOT NULL;