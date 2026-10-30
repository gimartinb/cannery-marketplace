CREATE TABLE `maker_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`displayOrder` integer DEFAULT 100 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `maker_categories_name_unique` ON `maker_categories` (`name`);--> statement-breakpoint
INSERT INTO `maker_categories` (`name`, `displayOrder`) VALUES
('Ceramics', 10),
('Coffee, Matcha & Bakery', 20),
('Candles & Bath', 30),
('Food & Pantry', 40),
('Home & Gifts', 50),
('Jewelry', 60),
('Kids & Baby', 70),
('Paper & Art', 80),
('Plants & Floral', 90),
('Textiles & Fiber', 100),
('Vintage', 110),
('Wearables', 120),
('Woodworking', 130);
