CREATE TABLE `ai_usage` (
	`email` text NOT NULL,
	`day` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`email`, `day`)
);
