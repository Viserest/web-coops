
import { sql } from "drizzle-orm";
import {
  blob,
  check,
  int,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";
import { now_s } from "./index";

/*
 * File system. Quick query instead of directly to s3 bucket
 */

export const files = sqliteTable(
	"files",
	{
		// ids
		id: blob("id", { mode: "buffer" })
			.primaryKey()
			.notNull(),

		// details
		hash: text("hash"),
		size: int("size"),

		// timestamps
		createdAt: int("created_at")
			.notNull()
			.default(now_s()),
		accessedAt: int("accessed_at"),
		updatedAt: int("updated_at"),
		deletedAt: int("deleted_at"),
	},
	(table) => [
		check("files_id_length", sql`length(${table.id}) = 16`),
	],
);

/*
 * User system
 */

export enum Role {
	Subscriber = 0,
	User = 1,
	Admin = 6340,
}

export const users = sqliteTable(
	"users",
	{
		// ids
		id: blob("id", { mode: "buffer" })
			.primaryKey()
			.notNull(),

		// details
		name: text("name")
			.notNull(),
		email: text("email")
			.notNull(),
		password: text("password"),
		role: int("role"),

		// timestamps
		createdAt: int("created_at")
			.notNull()
			.default(now_s()),
		accessedAt: int("accessed_at"),
		updatedAt: int("updated_at"),
		deletedAt: int("deleted_at"),
	},
	(table) => [
		check("users_id_length", sql`length(${table.id}) = 16`),
		unique("users_email_unique").on(table.email),
	]
);

export const sessions = sqliteTable(
	"sessions",
	{
		// ids
		id: blob("id", { mode: "buffer" })
			.primaryKey()
			.notNull(),
		userId: blob("user_id", { mode: "buffer" })
			.notNull()
			.references(() => users.id),
		ipAddress: text("ip_addr"),

		// timestamps
		createdAt: int("created_at")
			.notNull()
			.default(now_s()),
		expiresAt: int("expires_at"),
	},
	(table) => [
		check("sessions_id_length", sql`length(${table.id}) = 16`),
	],
);

/*
 * Newsletter system
 */

export const messages = sqliteTable(
	"messages",
	{
		// ids
		id: blob("id", { mode: "buffer" })
			.primaryKey()
			.notNull(),
		fileId: blob("file_id", { mode: "buffer" })
			.references(() => files.id),

		// details
		views: int("views").notNull().default(0),
		sent: int("sent").notNull().default(0),
		subject: text("subject").notNull(),
		textbody: text("textbody").notNull(),

		// timestamps
		createdAt: int("created_at")
			.notNull()
			.default(now_s()),
		updatedAt: int("updated_at"),
		deletedAt: int("deleted_at"),
	},
	(table) => [
		check("messages_id_length", sql`length(${table.id}) = 16`),
	],
);

export const links = sqliteTable(
  "links",
	{
		// ids
    id: blob("id", { mode: "buffer" })
      .primaryKey()
      .notNull(),
    userId: blob("user_id", { mode: "buffer" })
      .notNull()
      .references(() => users.id),
    messageId: blob("message_id", { mode: "buffer" })
      .notNull()
      .references(() => messages.id),

    // details
    views: int("views").notNull().default(0),
    createdAt: int("created_at").notNull(),
  },
  (table) => [
    check("links_id_length", sql`length(${table.id}) = 16`),
    unique("links_user_message_unique").on(table.userId, table.messageId),
  ],
);


/*
 * Order system
 */

export const addresses = sqliteTable(
	"addresses",
	{
		// ids
		id: blob("id", { mode: "buffer" })
			.primaryKey()
			.notNull(),
		userId: blob("user_id", { mode: "buffer" })
			.notNull()
			.references(() => users.id),

		// details
		streetNumber: int("street_number").notNull(),
		code: text("code"),
		street: text("street").notNull(),
		city: text("city").notNull(),
		state: text("state").notNull(),

		// timestamps
		createdAt: int("created_at")
			.notNull()
			.default(now_s()),
		accessedAt: int("accessed_at"),
		updatedAt: int("updated_at"),
		deletedAt: int("deleted_at"),
	},
	(table) => [
		check("addresses_id_length", sql`length(${table.id}) = 16`),
	],
);

export const menuOptions = sqliteTable(
	"menu_options",
	{
		// ids
		id: blob("id", { mode: "buffer" })
			.primaryKey()
			.notNull(),

		// details
		which: int("which").notNull(),
		question: text("question").notNull(),
		price: int("price"),
		repeat_min: int("repeat_min").notNull(),
		repeat_max: int("repeat_max").notNull(),
	},
	(table) => [
		check("menu_options_id_length", sql`length(${table.id}) = 16`),
	],
);

export const categories = sqliteTable(
	"categories",
	{
		// ids
		id: blob("id", { mode: "buffer" })
			.primaryKey()
			.notNull(),
		categoryId: blob("category_id", { mode: "buffer" })
			.notNull()
			.references(() => categories.id),

		name: text("name").notNull(),
		position: int("position").notNull(),
	},
	(table) => [
		check("categories_id_length", sql`length(${table.id}) = 16`),
	],
);

export const menuItems = sqliteTable(
	"menu_items",
	{
		// ids
		id: blob("id", { mode: "buffer" })
			.primaryKey()
			.notNull(),
		categoryId: blob("category_id", { mode: "buffer" })
			.notNull()
			.references(() => categories.id),
		optionId: blob("option_id", { mode: "buffer" })
			.references(() => menuOptions.id),

		// details
		name: text("name").notNull(),
		description: text("description"),
		price: int("price").notNull(),
	},
	(table) => [
		check("menu_items_id_length", sql`length(${table.id}) = 16`),
	],
);

export const orderItems = sqliteTable(
	"order_items",
	{
		// ids
		id: blob("id", { mode: "buffer" })
			.primaryKey()
			.notNull(),
		orderId: blob("order_id", { mode: "buffer" })
			.notNull()
			.references(() => orders.id),
		menuItemId: blob("menu_item_id", { mode: "buffer" })
			.notNull()
			.references(() => menuItems.id),

		// details
		quantity: int("quantity").notNull(),
		unit_price: int("unit_price").notNull(),
		instructions: text("instructions"),
	},
	(table) => [
		check("order_items_id_length", sql`length(${table.id}) = 16`),
	],
);

export const orders = sqliteTable(
	"orders",
	{
		// ids
		id: blob("id", { mode: "buffer" })
			.primaryKey()
			.notNull(),
		userId: blob("user_id", { mode: "buffer" })
			.notNull()
			.references(() => users.id),

		// details
		subtotal: int("subtotal").notNull(),
		tax: int("tax").notNull(),
		total: int("total").notNull(),

		// timestamps
		createdAt: int("created_at")
			.notNull()
			.default(now_s()),
		accessedAt: int("accessed_at"),
		updatedAt: int("updated_at"),
		deletedAt: int("deleted_at"),
	},
	(table) => [
		check("orders_id_length", sql`length(${table.id}) = 16`),
	],
);

/*
 * Pagination results for returning lists
 */

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  items: Array<object>;
}
