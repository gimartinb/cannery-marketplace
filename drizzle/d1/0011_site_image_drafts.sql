CREATE TABLE `site_image_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text,
	`alt` text,
	`draftBy` text,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
