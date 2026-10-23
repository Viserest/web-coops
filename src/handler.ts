
import { IRequest, json, RouterType } from "itty-router";
import { and, count, eq, getTableColumns, isNull } from "drizzle-orm";
import { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";

import * as schema from "./schema";
import { Bindings, Db } from "./context";
import { createDb, nowSecs } from "./utils";
import { Uuid } from "./uuid";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Everything a permission function receives.
 * `db` is always set (reused from setDb/setUser, or created here).
 * `user` is set only if setUser ran earlier in the chain.
 */
export interface HandlerContext {
	req: IRequest;
	env: Bindings;
	ctx: ExecutionContext;
	db: Db;
	user?: schema.User;
}

/** A Drizzle sqliteTable that has an `id` column. */
export type TableWithId = SQLiteTable & { id: SQLiteColumn };

/** Column keys of a table, e.g. "id" | "name" | "email". */
export type Field<T extends SQLiteTable> = keyof T["$inferSelect"] & string;

/** Payload for create: the whole insert model, or only the chosen fields. */
export type CreatePayload<T extends SQLiteTable, K extends Field<T> = Field<T>> =
	Pick<T["$inferInsert"], Extract<K, keyof T["$inferInsert"]>>;

/** Payload for update: same as create, but every field is optional. */
export type UpdatePayload<T extends SQLiteTable, K extends Field<T> = Field<T>> =
	Partial<CreatePayload<T, K>>;

/** Shape returned by read/list: the whole row, or only the chosen fields. */
export type ReadPayload<T extends SQLiteTable, K extends Field<T> = Field<T>> =
	Pick<T["$inferSelect"], K>;

interface BaseOption {
	/** Called at the start of the route. true = continue, false = 403 Unauthorized. */
	permission?: (c: HandlerContext) => boolean | Promise<boolean>;
	/** Success message. A default is used when omitted. */
	message?: string;
}

/** `fields` limits which columns are used. Omit it to use the entire table. */
interface FieldOption<T extends SQLiteTable> extends BaseOption {
	fields?: readonly Field<T>[];
}

export interface DeleteOption extends BaseOption {
	/**
	 * true  -> UPDATE <table> SET deleted_at = <now> WHERE id = ?
	 * false -> DELETE FROM <table> WHERE id = ?   (default)
	 * Soft delete requires a `deleted_at` column on the table.
	 */
	soft?: boolean;
}

export interface RouteOptions<T extends TableWithId> {
	table: T;
	list?: FieldOption<T>;
	create?: FieldOption<T>;
	read?: FieldOption<T>;
	update?: FieldOption<T>;
	delete?: DeleteOption;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const reply = (message: string, status: number, extra: Record<string, unknown> = {}) =>
	json({ message, ...extra }, { status });

const toInt = (v: unknown, fallback: number): number => {
	const raw = Array.isArray(v) ? v[0] : v;
	if (raw === undefined || raw === "") return fallback;
	const n = Number(raw);
	return Number.isInteger(n) && n >= 0 ? n : fallback;
};

export function handler<R extends RouterType, T extends TableWithId>(
	router: R,
	path: string,
	options: RouteOptions<T>,
): R {
	const { table } = options;
	const columns = getTableColumns(table) as Record<string, SQLiteColumn>;
	const idCol = columns["id"]!;
	const deletedKey = Object.keys(columns).find((k) => columns[k]!.name === "deleted_at");
	const deletedCol = deletedKey ? columns[deletedKey] : undefined;

	if (options.delete?.soft && !deletedCol) {
		throw new Error("handler: soft delete needs a `deleted_at` column on the table");
	}

	// Soft-deleted rows are hidden from list/read/update.
	const notDeleted = deletedCol ? isNull(deletedCol) : undefined;

	/** Columns to select: chosen fields, or the entire table. */
	const selection = (fields?: readonly string[]) => {
		const keys = (fields ?? Object.keys(columns)).filter((k) => k in columns);
		return Object.fromEntries(keys.map((k) => [k, columns[k]!])) as Record<string, SQLiteColumn>;
	};

	/** Keys a client may write: chosen fields, or the entire table, minus id/deleted_at. */
	const writableKeys = (fields?: readonly string[]) =>
		(fields ?? Object.keys(columns)).filter((k) => k in columns && k !== "id" && k !== deletedKey);

	/** Copy only the allowed keys out of an untrusted JSON body. */
	const pick = (body: unknown, keys: string[]): Record<string, unknown> | null => {
		if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
		const src = body as Record<string, unknown>;
		const out: Record<string, unknown> = {};
		for (const k of keys) if (k in src) out[k] = src[k];
		return out;
	};

	/** Wraps a route: builds context, runs permission, catches unexpected errors. */
	const route =
		<O extends BaseOption>(opt: O, fn: (c: HandlerContext) => Promise<Response>) =>
		async (req: IRequest, env: Bindings, ctx: ExecutionContext): Promise<Response> => {
			const c: HandlerContext = {
				req,
				env,
				ctx,
				db: req.db ?? createDb(env),
				user: req.user,
			};
			try {
				if (opt.permission && !(await opt.permission(c))) {
					return reply("Unauthorized", 403);
				}
				return await fn(c);
			} catch (e) {
				console.error(e);
				return reply("Internal server error", 500);
			}
		};

	// LIST
	if (options.list) {
		const opt = options.list;
		router.get(
			path,
			route(opt, async ({ req, db }) => {
				const limit = Math.min(toInt(req.query?.limit, DEFAULT_LIMIT), MAX_LIMIT);
				const offset = toInt(req.query?.offset, 0);

				const items = await db
					.select(selection(opt.fields))
					.from(table)
					.where(notDeleted)
					.limit(limit)
					.offset(offset);
				const [{ total } = { total: 0 }] = await db
					.select({ total: count() })
					.from(table)
					.where(notDeleted);

				return reply(opt.message ?? "Found items", 200, {
					offset,
					limit,
					total,
					items,
				});
			}),
		);
	}

	// CREATE
	if (options.create) {
		const opt = options.create;
		router.post(
			path,
			route(opt, async ({ req, db }) => {
				const body = await req.json().catch(() => undefined);
				const data = pick(body, writableKeys(opt.fields));
				if (!data) return reply("Body must be a JSON object", 400);

				const id = Uuid.randomv4();
				await db.insert(table).values({
					...data,
					id: id.toBytes(),
				} as unknown as T["$inferInsert"]);

				return reply(opt.message ?? "Created", 201, {
					id: id.toString(),
				});
			}),
		);
	}

	// READ
	if (options.read) {
		const opt = options.read;
		router.get(
			path + "/:id",
			route(opt, async ({ req, db }) => {
				const id = req.params["id"];
				if (!id) return reply("Missing required field, id", 400);

				const [item] = await db
					.select(selection(opt.fields))
					.from(table)
					.where(and(eq(idCol, id), notDeleted))
					.limit(1);
				if (!item) return reply("Not found", 404);

				return reply(opt.message ?? "Found item", 200, {
					item,
				});
			}),
		);
	}

	// UPDATE
	if (options.update) {
		const opt = options.update;
		router.put(
			path + "/:id",
			route(opt, async ({ req, db }) => {
				const id = req.params["id"];
				if (!id) return reply("Missing required field, id", 400);

				const body = await req.json().catch(() => undefined);
				const data = pick(body, writableKeys(opt.fields));
				if (!data) return reply("Body must be a JSON object", 400);
				if (Object.keys(data).length === 0) return reply("No updatable fields provided", 400);

				const updated = await db
					.update(table)
					.set(data as unknown as Partial<T["$inferInsert"]>)
					.where(and(eq(idCol, id), notDeleted))
					.returning({ id: idCol });
				if (updated.length === 0) return reply("Not found", 404);

				return reply(opt.message ?? "Updated", 200);
			}),
		);
	}

	// DELETE
	if (options.delete) {
		const opt = options.delete;
		router.delete(
			path + "/:id",
			route(opt, async ({ req, db }) => {
				const id = req.params["id"];
				if (!id) return reply("Missing required field, id", 400);

				const deleted = opt.soft
					? await db
							.update(table)
							.set({ [deletedKey!]: nowSecs() } as unknown as Partial<T["$inferInsert"]>)
							.where(and(eq(idCol, id), notDeleted))
							.returning({ id: idCol })
					: await db.delete(table).where(eq(idCol, id)).returning({ id: idCol });
				if (deleted.length === 0) return reply("Not found", 404);

				return reply(opt.message ?? "Deleted", 200);
			}),
		);
	}

	return router;
}
