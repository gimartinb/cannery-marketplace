CREATE TABLE `listing_redirects` (
	`oldSlug` text PRIMARY KEY NOT NULL,
	`newSlug` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
