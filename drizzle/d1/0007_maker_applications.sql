CREATE TABLE `maker_applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`businessName` text NOT NULL,
	`city` text NOT NULL,
	`websiteUrl` text,
	`facebookUrl` text,
	`instagramUrl` text,
	`otherSocial` text,
	`tagline` text NOT NULL,
	`productDescription` text NOT NULL,
	`fullName` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`referredBy` text NOT NULL,
	`categories` text NOT NULL,
	`salesChannels` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`adminNote` text,
	`sourceHash` text,
	`reviewedAt` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `maker_applications_status_idx` ON `maker_applications` (`status`);--> statement-breakpoint
CREATE INDEX `maker_applications_source_idx` ON `maker_applications` (`sourceHash`,`createdAt`);