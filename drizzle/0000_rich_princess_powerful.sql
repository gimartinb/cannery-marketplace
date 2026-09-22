CREATE TABLE `admin_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(80) NOT NULL,
	`passwordHash` text NOT NULL,
	`failedAttempts` int NOT NULL DEFAULT 0,
	`lockedUntil` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp,
	CONSTRAINT `admin_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_credentials_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `credential_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`accountType` enum('admin','vendor') NOT NULL,
	`accountId` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credential_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `credential_sessions_token_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `vendor_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp,
	CONSTRAINT `vendor_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `vendor_accounts_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `vendor_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerAccountId` int,
	`slug` varchar(160) NOT NULL,
	`name` varchar(140) NOT NULL,
	`category` varchar(100) NOT NULL,
	`shortBio` text NOT NULL,
	`ownerBio` text,
	`contactEmail` varchar(320) NOT NULL,
	`websiteUrl` varchar(500),
	`instagramUrl` varchar(500),
	`facebookUrl` varchar(500),
	`tiktokUrl` varchar(500),
	`coverImageUrl` varchar(700),
	`galleryImageUrls` text,
	`featured` boolean NOT NULL DEFAULT false,
	`displayOrder` int NOT NULL DEFAULT 100,
	`active` boolean NOT NULL DEFAULT true,
	`approvedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendor_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `vendor_profiles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `vendor_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`profileId` int,
	`name` varchar(140) NOT NULL,
	`slug` varchar(160) NOT NULL,
	`category` varchar(100) NOT NULL,
	`shortBio` text NOT NULL,
	`ownerBio` text,
	`contactEmail` varchar(320) NOT NULL,
	`websiteUrl` varchar(500),
	`instagramUrl` varchar(500),
	`facebookUrl` varchar(500),
	`tiktokUrl` varchar(500),
	`coverImageUrl` varchar(700),
	`galleryImageUrls` text,
	`featured` boolean NOT NULL DEFAULT false,
	`displayOrder` int NOT NULL DEFAULT 100,
	`active` boolean NOT NULL DEFAULT true,
	`status` enum('draft','pending','approved','rejected','changes_requested') NOT NULL DEFAULT 'draft',
	`adminNote` text,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendor_submissions_id` PRIMARY KEY(`id`)
);
