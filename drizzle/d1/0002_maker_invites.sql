CREATE TABLE `maker_invites` (
	`email` text PRIMARY KEY NOT NULL,
	`invitedBy` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
