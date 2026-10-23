-- Custom SQL migration file, put your code below! --


-- updated_at: only fires when the app didn't set it itself (also prevents recursion)
CREATE TRIGGER `addresses_updated_at` AFTER UPDATE ON `addresses`
FOR EACH ROW WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
	UPDATE `addresses` SET `updated_at` = unixepoch() WHERE `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `files_updated_at` AFTER UPDATE ON `files`
FOR EACH ROW WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
	UPDATE `files` SET `updated_at` = unixepoch() WHERE `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `messages_updated_at` AFTER UPDATE ON `messages`
FOR EACH ROW WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
	UPDATE `messages` SET `updated_at` = unixepoch() WHERE `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `orders_updated_at` AFTER UPDATE ON `orders`
FOR EACH ROW WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
	UPDATE `orders` SET `updated_at` = unixepoch() WHERE `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `users_updated_at` AFTER UPDATE ON `users`
FOR EACH ROW WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
	UPDATE `users` SET `updated_at` = unixepoch() WHERE `id` = NEW.`id`;
END;
--> statement-breakpoint
-- categories: reject any parent change that would create a cycle of any length
CREATE TRIGGER `categories_no_cycle` BEFORE UPDATE OF `parent_id` ON `categories`
FOR EACH ROW WHEN NEW.`parent_id` IS NOT NULL
BEGIN
	SELECT RAISE(ABORT, 'categories: cycle detected')
	WHERE EXISTS (
		WITH RECURSIVE ancestors(id) AS (
			SELECT NEW.`parent_id`
			UNION
			SELECT c.`parent_id` FROM `categories` c
			JOIN ancestors a ON c.`id` = a.id
			WHERE c.`parent_id` IS NOT NULL
		)
		SELECT 1 FROM ancestors WHERE id = NEW.`id`
	);
END;
