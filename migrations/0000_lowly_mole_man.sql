CREATE TABLE `addresses` (
	`id` blob PRIMARY KEY NOT NULL,
	`user_id` blob NOT NULL,
	`street_number` text NOT NULL,
	`street` text NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`accessed_at` integer,
	`updated_at` integer,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "addresses_id_length" CHECK(length("addresses"."id") = 16),
	CONSTRAINT "addresses_user_id_length" CHECK(length("addresses"."user_id") = 16)
);
--> statement-breakpoint
CREATE INDEX `addresses_user_id_idx` ON `addresses` (`user_id`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` blob PRIMARY KEY NOT NULL,
	`file_id` blob,
	`parent_id` blob,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "categories_id_length" CHECK(length("categories"."id") = 16),
	CONSTRAINT "categories_file_id_length" CHECK(length("categories"."file_id") = 16),
	CONSTRAINT "categories_parent_id_length" CHECK(length("categories"."parent_id") = 16),
	CONSTRAINT "categories_no_self_parent" CHECK("categories"."parent_id" IS NULL OR "categories"."parent_id" <> "categories"."id"),
	CONSTRAINT "categories_position_check" CHECK("categories"."position" >= 0)
);
--> statement-breakpoint
CREATE INDEX `categories_parent_id_idx` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE INDEX `categories_file_id_idx` ON `categories` (`file_id`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` blob PRIMARY KEY NOT NULL,
	`user_id` blob NOT NULL,
	`size` integer NOT NULL,
	`hash` text NOT NULL,
	`scope` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`accessed_at` integer,
	`updated_at` integer,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "files_id_length" CHECK(length("files"."id") = 16),
	CONSTRAINT "files_user_id_length" CHECK(length("files"."user_id") = 16),
	CONSTRAINT "files_size_check" CHECK("files"."size" >= 0)
);
--> statement-breakpoint
CREATE INDEX `files_user_id_idx` ON `files` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `files_hash_idx` ON `files` (`hash`);--> statement-breakpoint
CREATE TABLE `links` (
	`id` blob PRIMARY KEY NOT NULL,
	`user_id` blob NOT NULL,
	`message_id` blob NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`accessed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "links_id_length" CHECK(length("links"."id") = 16),
	CONSTRAINT "links_user_id_length" CHECK(length("links"."user_id") = 16),
	CONSTRAINT "links_message_id_length" CHECK(length("links"."message_id") = 16)
);
--> statement-breakpoint
CREATE INDEX `links_user_id_idx` ON `links` (`user_id`);--> statement-breakpoint
CREATE INDEX `links_message_id_idx` ON `links` (`message_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `links_user_message_idx` ON `links` (`user_id`,`message_id`);--> statement-breakpoint
CREATE TABLE `menu_item_options` (
	`menu_item_id` blob NOT NULL,
	`option_id` blob NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`menu_item_id`, `option_id`),
	FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`option_id`) REFERENCES `menu_options`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "menu_item_options_menu_item_id_length" CHECK(length("menu_item_options"."menu_item_id") = 16),
	CONSTRAINT "menu_item_options_option_id_length" CHECK(length("menu_item_options"."option_id") = 16)
);
--> statement-breakpoint
CREATE INDEX `menu_item_options_option_id_idx` ON `menu_item_options` (`option_id`);--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` blob PRIMARY KEY NOT NULL,
	`file_id` blob,
	`category_id` blob NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` integer NOT NULL,
	FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "menu_items_id_length" CHECK(length("menu_items"."id") = 16),
	CONSTRAINT "menu_items_file_id_length" CHECK(length("menu_items"."file_id") = 16),
	CONSTRAINT "menu_items_category_id_length" CHECK(length("menu_items"."category_id") = 16),
	CONSTRAINT "menu_items_price_check" CHECK("menu_items"."price" >= 0)
);
--> statement-breakpoint
CREATE INDEX `menu_items_category_id_idx` ON `menu_items` (`category_id`);--> statement-breakpoint
CREATE INDEX `menu_items_file_id_idx` ON `menu_items` (`file_id`);--> statement-breakpoint
CREATE TABLE `menu_options` (
	`id` blob PRIMARY KEY NOT NULL,
	`file_id` blob,
	`type` integer NOT NULL,
	`question` text NOT NULL,
	`price` integer,
	`repeat_min` integer NOT NULL,
	`repeat_max` integer NOT NULL,
	FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "menu_options_type_idx" CHECK("menu_options"."type" IN (0, 1)),
	CONSTRAINT "menu_options_id_length" CHECK(length("menu_options"."id") = 16),
	CONSTRAINT "menu_options_file_id_length" CHECK(length("menu_options"."file_id") = 16),
	CONSTRAINT "menu_options_price_check" CHECK("menu_options"."price" >= 0),
	CONSTRAINT "menu_options_repeat_min_check" CHECK("menu_options"."repeat_min" >= 0),
	CONSTRAINT "menu_options_repeat_range_check" CHECK("menu_options"."repeat_max" >= "menu_options"."repeat_min")
);
--> statement-breakpoint
CREATE INDEX `menu_options_file_id_idx` ON `menu_options` (`file_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` blob PRIMARY KEY NOT NULL,
	`file_id` blob,
	`view_count` integer DEFAULT 0 NOT NULL,
	`sent_count` integer DEFAULT 0 NOT NULL,
	`subject` text NOT NULL,
	`s.textbody` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer,
	`deleted_at` integer,
	FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "messages_id_length" CHECK(length("messages"."id") = 16),
	CONSTRAINT "messages_file_id_length" CHECK(length("messages"."file_id") = 16),
	CONSTRAINT "messages_sent_count_check" CHECK("messages"."sent_count" >= 0),
	CONSTRAINT "messages_view_count_check" CHECK("messages"."view_count" >= 0)
);
--> statement-breakpoint
CREATE INDEX `messages_file_id_idx` ON `messages` (`file_id`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` blob PRIMARY KEY NOT NULL,
	`order_id` blob NOT NULL,
	`menu_item_id` blob NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`instructions` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "order_items_id_length" CHECK(length("order_items"."id") = 16),
	CONSTRAINT "order_items_order_id_length" CHECK(length("order_items"."order_id") = 16),
	CONSTRAINT "order_items_menu_item_id_length" CHECK(length("order_items"."menu_item_id") = 16),
	CONSTRAINT "order_items_quantity_check" CHECK("order_items"."quantity" > 0),
	CONSTRAINT "order_items_unit_price_check" CHECK("order_items"."unit_price" >= 0)
);
--> statement-breakpoint
CREATE INDEX `order_items_order_id_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_items_menu_item_id_idx` ON `order_items` (`menu_item_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` blob PRIMARY KEY NOT NULL,
	`user_id` blob NOT NULL,
	`address_id` blob,
	`status` integer NOT NULL,
	`type` integer NOT NULL,
	`subtotal` integer NOT NULL,
	`tax` integer NOT NULL,
	`total` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`accessed_at` integer,
	`updated_at` integer,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`address_id`) REFERENCES `addresses`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "orders_id_length" CHECK(length("orders"."id") = 16),
	CONSTRAINT "orders_user_id_length" CHECK(length("orders"."user_id") = 16),
	CONSTRAINT "orders_address_id_length" CHECK(length("orders"."address_id") = 16),
	CONSTRAINT "orders_status_check" CHECK("orders"."status" IN (0, 1, 2, 3, 4, 5, 6)),
	CONSTRAINT "orders_type_check" CHECK("orders"."type" IN (0, 1)),
	CONSTRAINT "orders_amounts_check" CHECK("orders"."subtotal" >= 0 AND "orders"."tax" >= 0),
	CONSTRAINT "orders_total_check" CHECK("orders"."total" = "orders"."subtotal" + "orders"."tax")
);
--> statement-breakpoint
CREATE INDEX `orders_user_id_idx` ON `orders` (`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` blob PRIMARY KEY NOT NULL,
	`user_id` blob NOT NULL,
	`ip_addr` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "sessions_id_length" CHECK(length("sessions"."id") = 16),
	CONSTRAINT "sessions_user_id_length" CHECK(length("sessions"."user_id") = 16)
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` blob PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text,
	`role` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`accessed_at` integer,
	`updated_at` integer,
	`deleted_at` integer,
	CONSTRAINT "users_id_length" CHECK(length("users"."id") = 16),
	CONSTRAINT "users_role_check" CHECK("users"."role" IN (0, 1, 2, 6340)),
	CONSTRAINT "users_email_lowercase" CHECK("users"."email" = lower("users"."email"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`) WHERE "users"."deleted_at" IS NULL;