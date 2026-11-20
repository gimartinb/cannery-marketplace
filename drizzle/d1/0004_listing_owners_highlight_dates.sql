ALTER TABLE `product_highlights` ADD `startsAt` integer;--> statement-breakpoint
ALTER TABLE `product_highlights` ADD `endsAt` integer;--> statement-breakpoint
ALTER TABLE `vendor_profiles` ADD `loginEmail` text;--> statement-breakpoint
CREATE INDEX `vendor_profiles_login_email_idx` ON `vendor_profiles` (`loginEmail`);--> statement-breakpoint
UPDATE `vendor_profiles` SET `loginEmail` = (SELECT `email` FROM `vendor_accounts` WHERE `vendor_accounts`.`id` = `vendor_profiles`.`ownerAccountId`) WHERE `ownerAccountId` IS NOT NULL AND `loginEmail` IS NULL;