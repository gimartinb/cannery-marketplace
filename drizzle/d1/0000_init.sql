CREATE TABLE `site_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vendor_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`lastSignedIn` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vendor_accounts_email_unique` ON `vendor_accounts` (`email`);--> statement-breakpoint
CREATE TABLE `vendor_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ownerAccountId` integer,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`category` text NOT NULL,
	`shortBio` text NOT NULL,
	`ownerBio` text,
	`contactEmail` text NOT NULL,
	`websiteUrl` text,
	`instagramUrl` text,
	`facebookUrl` text,
	`tiktokUrl` text,
	`coverImageUrl` text,
	`galleryImageUrls` text,
	`featured` integer DEFAULT false NOT NULL,
	`displayOrder` integer DEFAULT 100 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`approvedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vendor_profiles_slug_unique` ON `vendor_profiles` (`slug`);--> statement-breakpoint
CREATE TABLE `vendor_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`accountId` integer NOT NULL,
	`profileId` integer,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`category` text NOT NULL,
	`shortBio` text NOT NULL,
	`ownerBio` text,
	`contactEmail` text NOT NULL,
	`websiteUrl` text,
	`instagramUrl` text,
	`facebookUrl` text,
	`tiktokUrl` text,
	`coverImageUrl` text,
	`galleryImageUrls` text,
	`featured` integer DEFAULT false NOT NULL,
	`displayOrder` integer DEFAULT 100 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`adminNote` text,
	`reviewedAt` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
