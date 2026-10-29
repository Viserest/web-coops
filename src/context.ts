
import { IRequest, RequestHandler } from "itty-router";
import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import * as d from "drizzle-orm";
import { Uuid, getCookie, reply } from "webutils";

import * as schema from "./schema";
import { X_OPTIONS } from "./index";
import { createRouterApi, createRouterHtml } from "webutils/router";
import { createHandlers } from "webutils/handler";

//
// Environment arguments
//

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

//
// Request types
//

export type RequestBase = IRequest;
/** After setDb: `db` is guaranteed. */
export type RequestDb = RequestBase & {
	db: Db;
}
/** After setUser: `db` and `user` are both guaranteed. */
export type RequestUser = RequestDb & {
	user: schema.User;
}

//
// Routers
//

export const routerHtml = createRouterHtml<RequestBase, Args>();
export const routerApi = createRouterApi<RequestBase, Args>();

//
// Handlers
//

export const { handler, op } = createHandlers<RequestBase, [Bindings, ExecutionContext]>({
	getDb: (req, env) => (req as any).db ?? drizzle(env.DB),
});

/** Builds a middleware that attaches `req.db`. Never rejects. */
export function createSetDb<A extends AnyArgs = Args>(): RequestHandler<RequestBase, A> {
	return (req, ...args) => {
		req.db ??= drizzle(args[0].DB);
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
		req.db ??= drizzle(args[0].DB);

		// Get session id
		const cookie = getCookie(req.headers, X_OPTIONS.SESSION_COOKIE_NAME);
		if (!cookie.ok) return onError(req, ...args);

		// Convert to uuid
		let idSession: Uuid;
		try {
			idSession = Uuid.fromString(cookie.value);
		} catch {
			return onError(req, ...args);
		}

		// Get user
		const result = await req.db
			.select({ ...d.getTableColumns(schema.users) })
			.from(schema.users)
			.innerJoin(schema.sessions, d.eq(schema.users.id, schema.sessions.userId))
			.where(d.eq(
				schema.sessions.id,
				Buffer.from(idSession.toBytes()),
			))
			.limit(1)
			.get();
		if (!result) return onError(req, ...args);

		req.user = result;
	};
}

/** Ready-made versions for the default (env, ctx) arguments. */
export const setDb = createSetDb();
export const setUser = createSetUser();
