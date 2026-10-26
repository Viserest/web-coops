
import * as d from "drizzle-orm";

import * as schema from "./schema";
import { Db, RequestUser } from "./context";

export const checkRole = (user: schema.User, role: schema.Role) =>
	user && user.role === role;

export const adminOnly = (req: RequestUser) =>
	checkRole(req.user, schema.Role.Admin);

// cron job stuff
export async function purgeExpiredSessions(db: Db) {
	await db.delete(schema.sessions)
		.where(d.lt(schema.sessions.expiresAt, d.sql`unixepoch()`));
}
