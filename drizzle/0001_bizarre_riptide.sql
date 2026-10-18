CREATE TABLE `admin_google_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`googleSub` varchar(64) NOT NULL,
	`email` varchar(320) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSignedIn` timestamp,
	CONSTRAINT `admin_google_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_google_accounts_sub_unique` UNIQUE(`googleSub`)
);
