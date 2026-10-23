
import { AutoRouter, IRequest, RequestHandler } from "itty-router";
import { DrizzleD1Database } from "drizzle-orm/d1";
import { eq, getTableColumns } from "drizzle-orm";

import * as schema from "./schema";
import { Uuid } from "./uuid";
import { createDb, getCookie, reply } from "./utils";
import { X_OPTIONS } from "./index";
import { errorPage, rendered } from "./error";

export interface Bindings {
	DB: D1Database;
	IMAGES: R2Bucket;
	EMAIL: SendEmail;
}

/** The arguments every handler receives after the request. */
export type Args = [env: Bindings, ctx: ExecutionContext];

/**
 * Anything that starts with (env, ctx) and may carry extra arguments after
 * them, e.g. [Bindings, ExecutionContext, Logger]. Middlewares are generic
 * over this so they work with whatever extra args your router passes.
 */
export type AnyArgs = [...Args, ...rest: any[]];

export type Db = DrizzleD1Database<typeof schema>;

export type RequestBase = IRequest;

/** After setDb: `db` is guaranteed. */
export type RequestDb = {
	db: Db;
} & IRequest;

/** After setUser: `db` and `user` are both guaranteed. */
export type RequestUser = {
	db: Db;
	user: schema.User;
} & IRequest;

export const router = AutoRouter<RequestBase, Args>({
	// Thrown errors: log server-side only, never send the message or stack to the client
	catch: (err: any, request) => {
		console.error(err);
		const s = err?.status;
		const status = Number.isInteger(s) && s >= 400 && s < 600 ? s : 500;
		return errorPage(status, request);
	},
	// Runs after AutoRouter's own missing (404) and format steps,
	// so every error response ends up as the page
	finally: [
		(res: Response, request) =>
			res instanceof Response && res.status >= 400 && !rendered.has(res)
				? errorPage(res.status, request)
				: res,
	],
});

/** Builds a middleware that attaches `req.db`. Never rejects. */
export function createSetDb<A extends AnyArgs = Args>(): RequestHandler<RequestBase, A> {
	return (req, ...args) => {
		req.db ??= createDb(args[0]);
	};
}

/** Runs when a middleware rejects. Receives the same arguments as the route. */
export type OnError<A extends AnyArgs = Args> = (
	req: RequestBase,
	...args: A
) => Response | Promise<Response>;

/**
 * Builds a middleware that attaches `req.db` and `req.user`.
 * On any failure (no cookie, bad uuid, no matching session) it returns
 * `onError(req, ...args)`, or the default 401 when none is given. Returning a
 * Response stops the chain, so handlers registered after it can rely on
 * `user` being set.
 */
export function createSetUser<A extends AnyArgs = Args>(
	onError: OnError<A> = () => reply("Unauthorized", 401),
): RequestHandler<RequestBase, A> {
	return async (req, ...args) => {
		const env = args[0];
		req.db ??= createDb(env);

		// Get session id
		const cookie = getCookie(req, X_OPTIONS.SESSION_COOKIE_NAME);
		if (!cookie) return onError(req, ...args);

		// Convert to uuid
		let idSession: Uuid;
		try {
			idSession = Uuid.fromString(cookie);
		} catch {
			return onError(req, ...args);
		}

		// Get user
		const result = await req.db
			.select({ ...getTableColumns(schema.users) })
			.from(schema.users)
			.innerJoin(schema.sessions, eq(schema.users.id, schema.sessions.userId))
			.where(eq(schema.sessions.id, idSession.toBytes()))
			.limit(1)
			.get();
		if (!result) return onError(req, ...args);

		req.user = result;
	};
}

/** Ready-made versions for the default (env, ctx) arguments. */
export const setDb = createSetDb();
export const setUser = createSetUser();
