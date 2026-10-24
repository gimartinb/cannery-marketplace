CREATE TABLE `gift_boxes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`price` text NOT NULL,
	`priceCents` integer,
	`description` text NOT NULL,
	`details` text,
	`imageUrl` text,
	`checkoutUrl` text,
	`externalItemId` text,
	`externalVariationId` text,
	`corporateOnly` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`displayOrder` integer DEFAULT 100 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gift_boxes_slug_unique` ON `gift_boxes` (`slug`);--> statement-breakpoint
CREATE TABLE `gift_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company` text NOT NULL,
	`contactName` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`quantity` integer NOT NULL,
	`budgetPerGift` text NOT NULL,
	`neededBy` text,
	`deliveryMethod` text NOT NULL,
	`destinations` text,
	`branding` text NOT NULL,
	`cardMessage` text,
	`logoLink` text,
	`startingBox` text,
	`customBox` integer DEFAULT false NOT NULL,
	`preferredCategories` text NOT NULL,
	`preferredMakers` text,
	`message` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`adminNote` text,
	`quoteAmount` text,
	`externalOrderId` text,
	`sourceHash` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `gift_requests_status_idx` ON `gift_requests` (`status`);--> statement-breakpoint
CREATE INDEX `gift_requests_source_idx` ON `gift_requests` (`sourceHash`,`createdAt`);--> statement-breakpoint
CREATE TABLE `site_text` (
	`key` text PRIMARY KEY NOT NULL,
	`draft` text,
	`published` text,
	`draftBy` text,
	`publishedBy` text,
	`publishedAt` integer,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `site_text_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`text` text NOT NULL,
	`publishedBy` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `site_text_history_key_idx` ON `site_text_history` (`key`,`id`);--> statement-breakpoint
INSERT INTO `gift_boxes` (`slug`, `name`, `price`, `priceCents`, `description`, `details`, `displayOrder`) VALUES
('new-baby-reveal-box', 'New Baby Reveal', '$72', 7200, 'A joyful little welcome for the newest person in the family, and the people learning to love a whole new life.', 'Sample box: keepsake, cozy good, and sweet treat', 10),
('wedding-gift-box', 'Wedding Gift Box', '$88', 8800, 'A thoughtful way to toast the couple, honor their new chapter, and give them something beautiful to enjoy together.', 'Sample box: celebratory maker made gifts', 20),
('thank-you-box', 'Thank You Box', '$68', 6800, 'For the person who showed up, went the extra mile, or made a hard day feel lighter. A warm thank you, ready to send.', 'Sample box: gift note included', 30),
('with-sympathy-box', 'With Sympathy', '$74', 7400, 'A gentle gesture for a difficult season. Quiet comforts chosen to say, I am thinking of you, when words are hard to find.', 'Sample box: comforting goods and handwritten note', 40),
('made-in-gilroy-box', 'Made in Gilroy Box', '$78', 7800, 'A warm introduction to the makers of The Cannery. Perfect for a new neighbor, a host, or someone you want to bring a little Gilroy to.', 'Sample box: 3 to 4 maker made items', 50);
