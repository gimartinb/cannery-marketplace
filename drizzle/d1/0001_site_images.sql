CREATE TABLE `site_images` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`alt` text,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
