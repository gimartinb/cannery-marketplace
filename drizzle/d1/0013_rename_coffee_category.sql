-- "Coffee & Bakery" is now "Coffee, Matcha & Bakery".
UPDATE `vendor_profiles` SET `category` = 'Coffee, Matcha & Bakery' WHERE `category` = 'Coffee & Bakery';
--> statement-breakpoint
UPDATE `vendor_submissions` SET `category` = 'Coffee, Matcha & Bakery' WHERE `category` = 'Coffee & Bakery';
--> statement-breakpoint
UPDATE `product_highlights` SET `category` = 'Coffee, Matcha & Bakery' WHERE `category` = 'Coffee & Bakery';
