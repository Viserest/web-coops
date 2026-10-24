
import { sql } from "drizzle-orm";
import * as s from "drizzle-orm/sqlite-core";

/*
 * File system. Quick query instead of directly to s3 bucket
 */

export const files = s.sqliteTable(
	"files",
	{
		// ids
		id: s.blob("id", { mode: "buffer" })
			.primaryKey()
			.notNull(),
		userId: s.blob("user_id", { mode: "buffer" })
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),

		// details
		size: s.int("size").notNull(),
		hash: s.text("hash").notNull(),
		scope: s.text("scope"),

		// timestamps
		createdAt: s.int("created_at", { mode: "timestamp" })
			.notNull()
			.default(sql`(unixepoch())`),
		accessedAt: s.int("accessed_at", { mode: "timestamp" }),
		updatedAt: s.int("updated_at", { mode: "timestamp" }),
		deletedAt: s.int("deleted_at", { mode: "timestamp" }),
	},
	(t) => [
		// indexes
		s.index("files_user_id_idx").on(t.userId),
		s.unique("files_hash_idx").on(t.hash),
		// length check
		s.check("files_id_length", sql`length(${t.id}) = 16`),
		s.check("files_user_id_length", sql`length(${t.userId}) = 16`),
		// insert check
		s.check("files_size_check", sql`${t.size} >= 0`),
		// TODO: validate hash length
	],
);
export type File = typeof files.$inferSelect;

/*
 * User system
 */

export enum Role {
	Subscriber = 0,
	User = 1,
	Both = 2,
	Admin = 6340,
}
const roleIds = Object.values(Role).filter(
  (value): value is number => typeof value === "number",
);

export const users = s.sqliteTable(
	"users",
	{
		// ids
		id: s.blob("id", { mode: "buffer" })
			.primaryKey()
			.notNull(),

		// details
		name: s.text("name")
			.notNull(),
		email: s.text("email")
			.notNull(),
		password: s.text("password"),
		role: s.int("role").$type<Role>().notNull(),

		// timestamps
		createdAt: s.int("created_at", { mode: "timestamp" })
			.notNull()
			.default(sql`(unixepoch())`),
		accessedAt: s.int("accessed_at", { mode: "timestamp" }),
		updatedAt: s.int("updated_at", { mode: "timestamp" }),
		deletedAt: s.int("deleted_at", { mode: "timestamp" }),
	},
	(t) => [
		// indexes
		s.uniqueIndex("users_email_unique")
			.on(t.email)
			.where(sql`${t.deletedAt} IS NULL`),
		// length check
		s.check("users_id_length", sql`length(${t.id}) = 16`),
		// insert check
		s.check("users_role_check",
			sql`${t.role} IN (${sql.raw(roleIds.join(", "))})`),
		s.check("users_email_lowercase", sql`${t.email} = lower(${t.email})`),
	]
);
export type User = typeof users.$inferSelect;

export const sessions = s.sqliteTable(
	"sessions",
	{
		// ids
		id: s.blob("id", { mode: "buffer" })
			.primaryKey()
			.notNull(),
		userId: s.blob("user_id", { mode: "buffer" })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		ipAddress: s.text("ip_addr"),

		// timestamps
		createdAt: s.int("created_at", { mode: "timestamp" })
			.notNull()
			.default(sql`(unixepoch())`),
		expiresAt: s.int("expires_at", { mode: "timestamp" })
			.notNull(),
	},
	(t) => [
		// indexes
		s.index("sessions_user_id_idx").on(t.userId),
		s.index("sessions_expires_at_idx").on(t.expiresAt),
		// length check
		s.check("sessions_id_length", sql`length(${t.id}) = 16`),
		s.check("sessions_user_id_length", sql`length(${t.userId}) = 16`),
	],
);
export type Session = typeof sessions.$inferSelect;

/*
 * Newsletter system
 */

export const messages = s.sqliteTable(
	"messages",
	{
		// ids
		id: s.blob("id", { mode: "buffer" })
			.primaryKey()
			.notNull(),
		fileId: s.blob("file_id", { mode: "buffer" })
			.references(() => files.id, { onDelete: "set null" }),

		// details
		viewCount: s.int("view_count").notNull().default(0),
		sentCount: s.int("sent_count").notNull().default(0),
		subject: s.text("subject").notNull(),
		textbody: s.text("textbody").notNull(),

		// timestamps
		createdAt: s.int("created_at", { mode: "timestamp" })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: s.int("updated_at", { mode: "timestamp" }),
		deletedAt: s.int("deleted_at", { mode: "timestamp" }),
	},
	(t) => [
		// indexes
		s.index("messages_file_id_idx").on(t.fileId),
		// length check
		s.check("messages_id_length", sql`length(${t.id}) = 16`),
		s.check("messages_file_id_length", sql`length(${t.fileId}) = 16`),
		// insert check
		s.check("messages_sent_count_check", sql`${t.sentCount} >= 0`),
		s.check("messages_view_count_check", sql`${t.viewCount} >= 0`),
	],
);
export type Message = typeof messages.$inferSelect;

export const links = s.sqliteTable(
  "links",
	{
		// ids
    id: s.blob("id", { mode: "buffer" })
      .primaryKey()
      .notNull(),
    userId: s.blob("user_id", { mode: "buffer" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    messageId: s.blob("message_id", { mode: "buffer" })
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),

    // details
    views: s.int("views").notNull().default(0),
		createdAt: s.int("created_at", { mode: "timestamp" })
			.notNull()
			.default(sql`(unixepoch())`),
    accessedAt: s.int("accessed_at", { mode: "timestamp" }),
  },
	(t) => [
		// indexes
		s.unique("links_user_message_idx").on(t.userId, t.messageId),
    s.index("links_user_id_idx").on(t.userId),
		s.index("links_message_id_idx").on(t.messageId),
    // length check
    s.check("links_id_length", sql`length(${t.id}) = 16`),
    s.check("links_user_id_length", sql`length(${t.userId}) = 16`),
    s.check("links_message_id_length", sql`length(${t.messageId}) = 16`),
  ],
);
export type Link = typeof links.$inferSelect;

/*
 * Order system
 */

export const addresses = s.sqliteTable(
	"addresses",
	{
		// ids
		id: s.blob("id", { mode: "buffer" })
			.primaryKey()
			.notNull(),
		userId: s.blob("user_id", { mode: "buffer" })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),

		// details
		streetNumber: s.text("street_number").notNull(),
		street: s.text("street").notNull(),
		city: s.text("city").notNull(),
		state: s.text("state").notNull(),

		// timestamps
		createdAt: s.int("created_at", { mode: "timestamp" })
			.notNull()
			.default(sql`(unixepoch())`),
		accessedAt: s.int("accessed_at", { mode: "timestamp" }),
		updatedAt: s.int("updated_at", { mode: "timestamp" }),
		deletedAt: s.int("deleted_at", { mode: "timestamp" }),
	},
	(t) => [
		// indexes
		s.index("addresses_user_id_idx").on(t.userId),
		// length check
		s.check("addresses_id_length", sql`length(${t.id}) = 16`),
		s.check("addresses_user_id_length", sql`length(${t.userId}) = 16`),
	],
);
export type Address = typeof addresses.$inferSelect;

// menu
export const categories = s.sqliteTable(
	"categories",
	{
		// ids
		id: s.blob("id", { mode: "buffer" })
			.primaryKey()
			.notNull(),
		fileId: s.blob("file_id", { mode: "buffer" })
			.references(() => files.id, { onDelete: "set null" }),
		parentId: s.blob("parent_id", { mode: "buffer" })
			.references((): s.AnySQLiteColumn => categories.id, { onDelete: "restrict" }),

		name: s.text("name").notNull(),
		description: s.text("description"),
		position: s.int("position").notNull(),
	},
	(t) => [
		// indexes
		s.index("categories_parent_id_idx").on(t.parentId),
		s.index("categories_file_id_idx").on(t.fileId),
		// length check
		s.check("categories_id_length", sql`length(${t.id}) = 16`),
		s.check("categories_file_id_length", sql`length(${t.fileId}) = 16`),
		s.check("categories_parent_id_length", sql`length(${t.parentId}) = 16`),
		// insert check
		s.check("categories_no_self_parent",
			sql`${t.parentId} IS NULL OR ${t.parentId} <> ${t.id}`),
		s.check("categories_position_check", sql`${t.position} >= 0`),
	],
);
export type Category = typeof categories.$inferSelect;

// menu item is placed on menu
export const menuItems = s.sqliteTable(
	"menu_items",
	{
		// ids
		id: s.blob("id", { mode: "buffer" })
			.primaryKey()
			.notNull(),
		fileId: s.blob("file_id", { mode: "buffer" })
			.references(() => files.id, { onDelete: "set null" }),
		categoryId: s.blob("category_id", { mode: "buffer" })
			.notNull()
			.references(() => categories.id),

		// details
		name: s.text("name").notNull(),
		description: s.text("description"),
		price: s.int("price").notNull(),
	},
	(t) => [
		// indexes
		s.index("menu_items_category_id_idx").on(t.categoryId),
		s.index("menu_items_file_id_idx").on(t.fileId),
		// length checks
		s.check("menu_items_id_length", sql`length(${t.id}) = 16`),
		s.check("menu_items_file_id_length", sql`length(${t.fileId}) = 16`),
		s.check("menu_items_category_id_length", sql`length(${t.categoryId}) = 16`),
		// insert checks
		s.check("menu_items_price_check", sql`${t.price} >= 0`),
	],
);
export type MenuItem = typeof menuItems.$inferSelect;

export const menuItemOptions = s.sqliteTable(
  "menu_item_options",
  {
    menuItemId: s.blob("menu_item_id", { mode: "buffer" })
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    optionId: s.blob("option_id", { mode: "buffer" })
      .notNull()
      .references(() => menuOptions.id, { onDelete: "cascade" }),

		position: s.int("position").notNull().default(0),
  },
	(t) => [
		// indexes
    s.primaryKey({ columns: [t.menuItemId, t.optionId] }),
		s.index("menu_item_options_option_id_idx").on(t.optionId),
		// length check
    s.check("menu_item_options_menu_item_id_length", sql`length(${t.menuItemId}) = 16`),
    s.check("menu_item_options_option_id_length", sql`length(${t.optionId}) = 16`),
  ],
);

export enum OptionType {
	Single = 0,
	Repeating = 1,
}
const optionTypes = Object.values(OptionType).filter(
  (value): value is number => typeof value === "number",
);

// menu options is placed onto a menu item
export const menuOptions = s.sqliteTable(
	"menu_options",
	{
		// ids
		id: s.blob("id", { mode: "buffer" })
			.primaryKey()
			.notNull(),
		fileId: s.blob("file_id", { mode: "buffer" })
			.references(() => files.id, { onDelete: "set null" }),

		// details
		type: s.int("type").$type<OptionType>().notNull(),
		question: s.text("question").notNull(),
		price: s.int("price"),
		repeatMin: s.int("repeat_min").notNull(),
		repeatMax: s.int("repeat_max").notNull(),
	},
	(t) => [
		// indexes
		s.check("menu_options_type_idx",
			sql`${t.type} IN (${sql.raw(optionTypes.join(", "))})`),
		s.index("menu_options_file_id_idx").on(t.fileId),
		// length checks
		s.check("menu_options_id_length", sql`length(${t.id}) = 16`),
		s.check("menu_options_file_id_length", sql`length(${t.fileId}) = 16`),
		// insert checks
		s.check("menu_options_price_check", sql`${t.price} >= 0`),
		s.check("menu_options_repeat_min_check", sql`${t.repeatMin} >= 0`),
		s.check("menu_options_repeat_range_check", sql`${t.repeatMax} >= ${t.repeatMin}`),
	],
);
export type MenuOption = typeof menuOptions.$inferSelect;

// The status just moves down this list
// If ordertype is pickup, then skip from ready to complete
export enum OrderStatus {
	Placed,
	Making,
	Baking,
	Ready,
	InRoute,
	Delivered,
	Complete,
}
const orderStatuses = Object.values(OrderStatus).filter(
  (value): value is number => typeof value === "number",
);

export enum OrderType {
	Pickup,
	Delivery,
}
const orderTypes = Object.values(OrderType).filter(
  (value): value is number => typeof value === "number",
);

export const orders = s.sqliteTable(
	"orders",
	{
		// ids
		id: s.blob("id", { mode: "buffer" })
			.primaryKey()
			.notNull(),
		userId: s.blob("user_id", { mode: "buffer" })
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		addressId: s.blob("address_id", { mode: "buffer" })
			.references(() => addresses.id),

		// details
		status: s.int("status").$type<OrderStatus>().notNull(),
		type: s.int("type").$type<OrderType>().notNull(),
		subtotal: s.int("subtotal").notNull(),
		tax: s.int("tax").notNull(),
		total: s.int("total").notNull(),

		// timestamps
		createdAt: s.int("created_at", { mode: "timestamp" })
			.notNull()
			.default(sql`(unixepoch())`),
		accessedAt: s.int("accessed_at", { mode: "timestamp" }),
		updatedAt: s.int("updated_at", { mode: "timestamp" }),
		deletedAt: s.int("deleted_at", { mode: "timestamp" }),
	},
	(t) => [
		// indexes
		s.index("orders_user_id_idx").on(t.userId),
		// length checks
		s.check("orders_id_length", sql`length(${t.id}) = 16`),
		s.check("orders_user_id_length", sql`length(${t.userId}) = 16`),
		s.check("orders_address_id_length", sql`length(${t.addressId}) = 16`),
		// insert checks
		s.check("orders_status_check",
			sql`${t.status} IN (${sql.raw(orderStatuses.join(", "))})`),
		s.check("orders_type_check",
			sql`${t.type} IN (${sql.raw(optionTypes.join(", "))})`),
		s.check("orders_amounts_check", sql`${t.subtotal} >= 0 AND ${t.tax} >= 0`),
		s.check("orders_total_check", sql`${t.total} = ${t.subtotal} + ${t.tax}`),
	],
);
export type Order = typeof orders.$inferSelect;

export const orderItems = s.sqliteTable(
	"order_items",
	{
		// ids
		id: s.blob("id", { mode: "buffer" })
			.primaryKey()
			.notNull(),
		orderId: s.blob("order_id", { mode: "buffer" })
			.notNull()
			.references(() => orders.id, { onDelete: "cascade" }),
		menuItemId: s.blob("menu_item_id", { mode: "buffer" })
			.notNull()
			.references(() => menuItems.id, { onDelete: "restrict" }),

		// details
		quantity: s.int("quantity").notNull(),
		unitPrice: s.int("unit_price").notNull(),
		instructions: s.text("instructions"),
	},
	(t) => [
		// indexes
		s.index("order_items_order_id_idx").on(t.orderId),
		s.index("order_items_menu_item_id_idx").on(t.menuItemId),
		// length checks
		s.check("order_items_id_length", sql`length(${t.id}) = 16`),
		s.check("order_items_order_id_length", sql`length(${t.orderId}) = 16`),
		s.check("order_items_menu_item_id_length", sql`length(${t.menuItemId}) = 16`),
		// insert checks
		s.check("order_items_quantity_check", sql`${t.quantity} > 0`),
		s.check("order_items_unit_price_check", sql`${t.unitPrice} >= 0`),
	],
);
export type OrderItem = typeof orderItems.$inferSelect;
