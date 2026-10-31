-- Categories Nancy asked for (Oct 30). Existing names are skipped. Added after the current list, in this order.
INSERT INTO `maker_categories` (`name`, `displayOrder`) SELECT `n`, `o` FROM (SELECT '3D Printing' AS `n`, COALESCE(MAX(`displayOrder`), 0) + 10 AS `o` FROM `maker_categories`) WHERE NOT EXISTS (SELECT 1 FROM `maker_categories` WHERE lower(`name`) = lower('3D Printing'));
--> statement-breakpoint
INSERT INTO `maker_categories` (`name`, `displayOrder`) SELECT `n`, `o` FROM (SELECT 'Accessories' AS `n`, COALESCE(MAX(`displayOrder`), 0) + 10 AS `o` FROM `maker_categories`) WHERE NOT EXISTS (SELECT 1 FROM `maker_categories` WHERE lower(`name`) = lower('Accessories'));
--> statement-breakpoint
INSERT INTO `maker_categories` (`name`, `displayOrder`) SELECT `n`, `o` FROM (SELECT 'Apparel' AS `n`, COALESCE(MAX(`displayOrder`), 0) + 10 AS `o` FROM `maker_categories`) WHERE NOT EXISTS (SELECT 1 FROM `maker_categories` WHERE lower(`name`) = lower('Apparel'));
--> statement-breakpoint
INSERT INTO `maker_categories` (`name`, `displayOrder`) SELECT `n`, `o` FROM (SELECT 'Artisanal Food' AS `n`, COALESCE(MAX(`displayOrder`), 0) + 10 AS `o` FROM `maker_categories`) WHERE NOT EXISTS (SELECT 1 FROM `maker_categories` WHERE lower(`name`) = lower('Artisanal Food'));
--> statement-breakpoint
INSERT INTO `maker_categories` (`name`, `displayOrder`) SELECT `n`, `o` FROM (SELECT 'Fine Art' AS `n`, COALESCE(MAX(`displayOrder`), 0) + 10 AS `o` FROM `maker_categories`) WHERE NOT EXISTS (SELECT 1 FROM `maker_categories` WHERE lower(`name`) = lower('Fine Art'));
--> statement-breakpoint
INSERT INTO `maker_categories` (`name`, `displayOrder`) SELECT `n`, `o` FROM (SELECT 'Garden' AS `n`, COALESCE(MAX(`displayOrder`), 0) + 10 AS `o` FROM `maker_categories`) WHERE NOT EXISTS (SELECT 1 FROM `maker_categories` WHERE lower(`name`) = lower('Garden'));
--> statement-breakpoint
INSERT INTO `maker_categories` (`name`, `displayOrder`) SELECT `n`, `o` FROM (SELECT 'Home Decor' AS `n`, COALESCE(MAX(`displayOrder`), 0) + 10 AS `o` FROM `maker_categories`) WHERE NOT EXISTS (SELECT 1 FROM `maker_categories` WHERE lower(`name`) = lower('Home Decor'));
--> statement-breakpoint
INSERT INTO `maker_categories` (`name`, `displayOrder`) SELECT `n`, `o` FROM (SELECT 'Jewelry' AS `n`, COALESCE(MAX(`displayOrder`), 0) + 10 AS `o` FROM `maker_categories`) WHERE NOT EXISTS (SELECT 1 FROM `maker_categories` WHERE lower(`name`) = lower('Jewelry'));
--> statement-breakpoint
INSERT INTO `maker_categories` (`name`, `displayOrder`) SELECT `n`, `o` FROM (SELECT 'Pets' AS `n`, COALESCE(MAX(`displayOrder`), 0) + 10 AS `o` FROM `maker_categories`) WHERE NOT EXISTS (SELECT 1 FROM `maker_categories` WHERE lower(`name`) = lower('Pets'));
--> statement-breakpoint
INSERT INTO `maker_categories` (`name`, `displayOrder`) SELECT `n`, `o` FROM (SELECT 'Self Care' AS `n`, COALESCE(MAX(`displayOrder`), 0) + 10 AS `o` FROM `maker_categories`) WHERE NOT EXISTS (SELECT 1 FROM `maker_categories` WHERE lower(`name`) = lower('Self Care'));
--> statement-breakpoint
INSERT INTO `maker_categories` (`name`, `displayOrder`) SELECT `n`, `o` FROM (SELECT 'Stationery' AS `n`, COALESCE(MAX(`displayOrder`), 0) + 10 AS `o` FROM `maker_categories`) WHERE NOT EXISTS (SELECT 1 FROM `maker_categories` WHERE lower(`name`) = lower('Stationery'));
--> statement-breakpoint
INSERT INTO `maker_categories` (`name`, `displayOrder`) SELECT `n`, `o` FROM (SELECT 'Toys' AS `n`, COALESCE(MAX(`displayOrder`), 0) + 10 AS `o` FROM `maker_categories`) WHERE NOT EXISTS (SELECT 1 FROM `maker_categories` WHERE lower(`name`) = lower('Toys'));
