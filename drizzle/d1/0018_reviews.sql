CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profileId` integer,
	`makerName` text,
	`rating` integer NOT NULL,
	`body` text NOT NULL,
	`reviewerName` text NOT NULL,
	`reviewerCity` text,
	`email` text,
	`photoUrl` text,
	`source` text DEFAULT 'website' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`ownerNote` text,
	`sourceHash` text,
	`reviewedBy` text,
	`reviewedAt` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reviews_profile_idx` ON `reviews` (`profileId`,`status`);--> statement-breakpoint
CREATE INDEX `reviews_status_idx` ON `reviews` (`status`);--> statement-breakpoint
CREATE INDEX `reviews_source_idx` ON `reviews` (`sourceHash`,`createdAt`);