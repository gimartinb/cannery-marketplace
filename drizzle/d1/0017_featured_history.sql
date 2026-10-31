CREATE TABLE `featured_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profileId` integer NOT NULL,
	`name` text NOT NULL,
	`startedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`endedAt` integer,
	`startedBy` text
);
--> statement-breakpoint
CREATE INDEX `featured_history_profile_idx` ON `featured_history` (`profileId`,`startedAt`);--> statement-breakpoint
-- Only 3 featured makers ever showed (the first 3 public ones by display order). Keep those 3 featured and clear the flag on the rest so the new limit holds.
UPDATE `vendor_profiles` SET `featured` = 0 WHERE `featured` = 1 AND `id` NOT IN (SELECT `id` FROM `vendor_profiles` WHERE `featured` = 1 AND `active` = 1 ORDER BY `displayOrder`, `name` LIMIT 3);
--> statement-breakpoint
INSERT INTO `featured_history` (`profileId`, `name`, `startedBy`) SELECT `id`, `name`, 'existing' FROM `vendor_profiles` WHERE `featured` = 1;
