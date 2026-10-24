
import * as d from "drizzle-orm";

import { Uuid } from "./uuid";
import { tag } from "./tag";
import { defineForm } from "./form";
import { handler } from "./handler";
import { adminOnly, checkRole, hashPassword, isAsciiOrSpace, isEmail, nowSecs, reply, verifyPassword } from "./utils";
import * as schema from "./schema";
import { RequestDb, RequestUser, router, setDb, setUser } from "./context";
import { X_OPTIONS } from "./index";

/*
 * File system. Quick query instead of directly to r2 bucket
 */

// Files
export const filesHandler = handler(router, "/api/v1/files", {
	table: schema.files,
	list: {
		before: [setUser, adminOnly],
		message: "Found files",
	},
	create: {
		before: [setUser, adminOnly],
		handler: async(req, env, ctx) => {
			if (!checkRole(req.user, schema.Role.Admin)) {
				return reply("Unauthorized", 403);
			}

			// Content type
			const contentTypeHeader = req.headers.get("content-type");
			const contentType = contentTypeHeader?.split(";", 1)[0].trim().toLowerCase();

			if (!contentType || !/^image\/[a-z0-9.+-]+$/.test(contentType)) {
				return reply("Content-Type must be an image MIME type", 415);
			}

			// Content length
			const lengthHeader = req.headers.get("content-length");
			if (!lengthHeader || !/^\d+$/.test(lengthHeader)) {
				return reply("A valid Content-Length header is required", 400);
			}

			const expectedSize = Number(lengthHeader);
			const maxSize = 4 * 1024 * 1024;

			if (!Number.isSafeInteger(expectedSize)) {
				return reply("Invalid Content-Length", 400);
			}
			if (expectedSize === 0) {
				return reply("File must not be empty", 400);
			}
			if (expectedSize >= maxSize) {
				return reply("File must be less than 4 MB", 413);
			}
			if (!req.body) {
				return reply("Request body is required", 400);
			}

			// Read with a limit so a body larger than the declared size can't consume
			// unbounded memory.
			const reader = req.body.getReader();
			const chunks: Uint8Array[] = [];
			let size = 0;

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					if (!value) continue;

					size += value.byteLength;
					if (size >= maxSize) {
						await reader.cancel();
						return reply("File must be less than 4 MB", 413);
					}
					if (size > expectedSize) {
						await reader.cancel();
						return reply("Content-Length does not match the request body", 400);
					}

					chunks.push(value);
				}
			} finally {
				reader.releaseLock();
			}

			if (size === 0) {
				return reply("File must not be empty", 400);
			}
			if (size !== expectedSize) {
				return reply("Content-Length does not match the request body", 400);
			}

			const bytes = new Uint8Array(size);
			let offset = 0;
			for (const chunk of chunks) {
				bytes.set(chunk, offset);
				offset += chunk.byteLength;
			}

			// hash
			const digest = await crypto.subtle.digest("SHA-256", bytes);
			const hash = Array.from(new Uint8Array(digest), byte =>
				byte.toString(16).padStart(2, "0"),
			).join("");

			// scope, can be null
			const scope = Array.isArray(req.query["scope"])
				? req.query["scope"].join(" ")
				: req.query["scope"];

			// add to r2 bucket
			const id = Uuid.randomv4();
			await env.IMAGES.put(id.toString(), bytes, {
				httpMetadata: { contentType },
			});

			// add to d1 table
			const result = await req.db
				.insert(schema.files)
				.values({
					id: id.toBytes(),
					userId: Uuid.fromBytes(req.user.id).toBytes(),
					size,
					hash,
					scope,
				})
				.run();
			if (!result.success) return reply("Error uploading file", 500);

			return reply("Uploaded file", 201);
		},
	},
	read: {
		before: [setUser, adminOnly],
		message: "Found file",
	},
	update: null,
	delete: {
		before: [setUser, adminOnly],
		handler: async(req, env, ctx) => {
			if (!checkRole(req.user, schema.Role.Admin)) {
				return reply("Unauthorized", 403);
			}

			let id;
			try {
				id = Uuid.fromString(req.params["id"]);
			} catch {
				return reply("Invalid required param, id", 400);
			}

			// delete from r2
			await env.IMAGES.delete(id.toString());

			// delete from d1
			const result = await req.db
				.delete(schema.files)
				.where(d.eq(schema.files.id, id.toBytes()))
				.run();
			if (!result.success) return reply("Error deleting file", 500);

			return reply("Deleted file", 200);
		},
	},
});

/*
 * User system
 */

// Newsletters
// create
export const subscribeForm = defineForm({
	href: "/api/v1/newsletter/subscribe",
	method: "POST",
	fields: {
		name: { type: "text", placeholder: "John Smith" },
		email: { type: "email", placeholder: "john@smith.com" },
	},
});
router.post<RequestDb>(subscribeForm.href, setDb, async (req, env, ctx) => {
	const result2 = await subscribeForm.parseRequest(req);
	if (!result2.ok) return reply(result2.error, 400);

	const { name, email } = result2.value;

	if (!isAsciiOrSpace(name)) return reply("Invalid required field, name", 400);
	if (!isEmail(email)) return reply("Invalid required field, email", 400);

	// Database calls
	const result = await req.db
		.insert(schema.users)
		.values({
			id: Uuid.randomv4().toBytes(),
			name,
			email,
			role: schema.Role.Subscriber,
		})
		.run();
	if (!result.success) return reply("Error subscribing", 500);

	return reply("Congrats! You're now subscribed!", 200);
});
// delete
export const unsubscribeForm = defineForm({
	href: "/api/v1/newsletter/unsubscribe",
	method: "POST",
	fields: {},
});
router.post<RequestDb>(unsubscribeForm.href, setDb, async (req, env, ctx) => {
	const data: { id_link: string | null } = await req.json();

	// Id of link
	const a = data["id_link"];
	if (!a) return reply("Missing required field, id_link", 400);
	let id_link: Uuid;
	try {
		id_link = Uuid.fromString(a);
	} catch {
		return reply("Invalid required field, id_link", 400);
	}

	// Database calls
	const result = await req.db
		.update(schema.users)
		.set({ deletedAt: new Date() })
		.from(schema.links)
		.where(d.and(
    	d.eq(schema.links.id, id_link.toBytes()),
			d.eq(schema.links.userId, schema.users.id),
	))
		.run();
	if (!result.success) return reply("Error unsubscribing", 500);

	return reply("Now unsubscribed", 200);
});

// Users
handler(router, "/api/v1/users", {
	table: schema.users,
	list: {
		before: [setUser, adminOnly],
		message: "Found users",
	},
	// register is an alias of create
	create: null,
	read: {
		before: [setUser, adminOnly],
		message: "Found user",
	},
	update: {
		before: [setUser, adminOnly],
		fields: ["name", "email", "role"],
		message: "Updated user",
	},
	delete: {
		before: [setUser, adminOnly],
		soft: true,
		message: "Deleted user",
	},
});
// create
export const registerForm = defineForm({
	href: "/api/v1/users/register",
	method: "POST",
	fields: {
		name: { type: "text", placeholder: "John Smith" },
		email: { type: "email", placeholder: "john@smith.com" },
		password: { type: "password", placeholder: "Password" },
	},
});
router.post<RequestDb>(registerForm.href, setDb, async (req, env, ctx) => {
	const result = await registerForm.parseRequest(req);
	if (!result.ok) return reply(result.error, 400);

	const { name, email, password } = result.value;

	const normalizedEmail = email.trim().toLowerCase();
	if (!isEmail(normalizedEmail)) {
		return reply("Invalid email", 400);
	}

	// Bound hashing work and avoid silently truncating passwords.
	if (new TextEncoder().encode(password).byteLength > 1024) {
		return reply("Password is too long", 400);
	}

	const passwordHash = await hashPassword(password);

	// Requires a UNIQUE constraint/index on users.email.
	const inserted = await req.db
		.insert(schema.users)
		.values({
			id: Uuid.randomv4().toBytes(),
			name: name.trim(),
			email: normalizedEmail,
			password: passwordHash,
			role: schema.Role.User,
		})
		.onConflictDoNothing()
		.returning({ id: schema.users.id })
		.get();
	if (!inserted) return reply("Email is already registered", 409);

	return reply("Registered", 201, {
		location: "/account/login",
	});
});

// Sessions
handler(router, "/api/v1/sessions", {
	table: schema.sessions,
	list: {
		before: [setUser, adminOnly],
		message: "Found sessions",
	},
	// login is an alias of create
	create: null,
	read: {
		before: [setUser, adminOnly],
		message: "Found session",
	},
	update: null,
	delete: {
		before: [setUser, adminOnly],
		soft: false,
		message: "Deleted session",
	},
});
// create
export const loginForm = defineForm({
	href: "/api/v1/users/login",
	method: "POST",
	fields: {
		email: { type: "email", placeholder: "john@smith.com" },
		password: { type: "password", placeholder: "Password" },
	},
});
router.post<RequestDb>(loginForm.href, setDb, async (req, env, ctx) => {
	const result2 = await loginForm.parseRequest(req);
	if (!result2.ok) return reply(result2.error, 400);

	const { email, password } = result2.value;

	const normalizedEmail = email.trim().toLowerCase();
	if (!isEmail(normalizedEmail)) {
		return reply("Invalid email", 400);
	}

	// Bound hashing work and avoid silently truncating passwords.
	if (new TextEncoder().encode(password).byteLength > 1024) {
		return reply("Password is too long", 400);
	}

	// get user
	const user = await req.db
		.select({ ...d.getTableColumns(schema.users) })
		.from(schema.users)
		.where(d.and(
			d.eq(schema.users.email, normalizedEmail),
			d.isNull(schema.users.deletedAt),
		))
		.limit(1)
		.get();
	if (!user) return reply("Invalid email or password", 401);

	const DUMMY_HASH = await hashPassword("dummy-password-for-timing");

	const result = await verifyPassword(password, user?.password ?? DUMMY_HASH);
	if (!user?.password || !result) return reply("Invalid email or password", 401);

	// create session
	const session = await req.db
		.insert(schema.sessions)
		.values({
			id: Uuid.randomv4().toBytes(),
			userId: user.id,
			expiresAt: new Date(Date.now() + X_OPTIONS.SESSION_COOKIE_EXPIRE * 1000),
		})
		.returning()
		.get();

	const res = reply("Logging in...", 200, {
		location: "/account/dashboard",
	});
	res.headers.append("Set-Cookie",
		X_OPTIONS.SESSION_COOKIE_NAME + "=" +
		Uuid.fromBytes(session.id).toString() +
		"; Path=/; HttpOnly; Secure; SameSite=Lax");
	return res;
});

/*
 * Newsletter system
 */

// Messages
handler(router, "/api/v1/messages", {
	table: schema.messages,
	list: {
		before: [setUser, adminOnly],
		message: "Found messages",
	},
	create: {
		before: [setUser, adminOnly],
		fields: ["subject", "textbody"],
		message: "Created new message",
	},
	read: {
		before: [setUser, adminOnly],
		message: "Found message",
	},
	update: {
		before: [setUser, adminOnly],
		fields: ["fileId", "subject", "textbody"],
		message: "Updated message",
	},
	delete: {
		before: [setUser, adminOnly],
		soft: true,
		message: "Deleted message",
	},
});
// Send an email message
router.post<RequestUser>("/api/v1/messages/:id/send", setUser, async (req, env, ctx) => {
	const data: { id_to?: string } = await req.json();

	const a = req.params["id"];
	if (!a) return reply("Missing required field, id", 400);
	const messageId = Uuid.fromString(a);

	// Database calls
	const message = await req.db
		.select({ ...d.getTableColumns(schema.messages) })
		.from(schema.messages)
		.where(d.eq(schema.messages.id, messageId.toBytes()))
		.limit(1)
		.get();
	if (!message) return reply("Error finding message", 500);

	const youve_got_mail = async (user: schema.User) => {
		const linkId = Uuid.randomv4();
		const link = await req.db
			.insert(schema.links)
			.values({
				id: linkId.toBytes(),
				userId: user.id,
				messageId: messageId.toBytes(),
		 	})
			.returning()
			.get();

		return env.EMAIL.send({
			to: user.email,
			from: X_OPTIONS.EMAIL,
			subject: message.subject,
			...temp_email(message, link),
		})
	};

	if (data.id_to) {
		const user = await req.db
			.select({ ...d.getTableColumns(schema.users) })
			.from(schema.users)
			.where(d.eq(schema.users.id, Uuid.fromString(data.id_to).toBytes()))
			.limit(1)
			.get();
		if (!user) return reply("Cannot find user", 400);

		const res = await youve_got_mail(user);
		console.info({ timestamp: nowSecs(), res });
		return reply("Sent to user: " + user.email, 200);
	} else {
		const users = await req.db
			.select({ ...d.getTableColumns(schema.users) })
			.from(schema.users)
			.where(d.or(
				d.eq(schema.users.role, schema.Role.Subscriber),
				d.eq(schema.users.role, schema.Role.Both),
			));

		let i = 0;
		for (const user of users) {
			const res = await youve_got_mail(user);
			console.info({ timestamp: nowSecs(), res });
			i++;
		}

		return reply("Sent to newsletter. Total: " + i + "/" + users.length, 200);
	}
});

// Links
handler(router, "/api/v1/links", {
	table: schema.links,
	list: {
		before: [setUser, adminOnly],
		message: "Found links",
	},
	create: null,
	read: {
		before: [setUser, adminOnly],
		message: "Found link",
	},
	update: null,
	delete: {
		before: [setUser, adminOnly],
		soft: false,
		message: "Deleted link",
	},
});

/*
 * Order system
 */

// Addresses
handler(router, "/api/v1/addresses", {
	table: schema.addresses,
	list: {
		before: [setUser, adminOnly],
		message: "Found addresses",
	},
	create: {
		before: [setUser, adminOnly],
		fields: ["streetNumber", "street", "city", "state"],
		message: "Created new address",
	},
	read: {
		before: [setUser, adminOnly],
		message: "Found address",
	},
	update: {
		before: [setUser, adminOnly],
		fields: ["streetNumber", "street", "city", "state"],
		message: "Updated address",
	},
	delete: {
		before: [setUser, adminOnly],
		soft: true,
		message: "Deleted address",
	},
});

// Categories
handler(router, "/api/v1/categories", {
	table: schema.categories,
	list: {
		before: [setUser, adminOnly],
		message: "Found categories",
	},
	create: {
		before: [setUser, adminOnly],
		fields: ["fileId", "parentId", "name", "position"],
		message: "Created new category",
	},
	read: {
		before: [setUser, adminOnly],
		message: "Found category",
	},
	update: {
		before: [setUser, adminOnly],
		fields: ["fileId", "parentId", "name", "position"],
		message: "Updated category",
	},
	delete: {
		before: [setUser, adminOnly],
		soft: false,
		message: "Deleted category",
	},
});

// Menu Items
handler(router, "/api/v1/menu_items", {
	table: schema.menuItems,
	list: {
		before: [setUser, adminOnly],
		message: "Found menu items",
	},
	create: {
		before: [setUser, adminOnly],
		fields: ["fileId", "categoryId", "name", "description", "price"],
		message: "Created new menu item",
	},
	read: {
		before: [setUser, adminOnly],
		message: "Found menu item",
	},
	update: {
		before: [setUser, adminOnly],
		fields: ["fileId", "categoryId", "name", "description", "price"],
		message: "Updated menu item",
	},
	delete: {
		before: [setUser, adminOnly],
		soft: false,
		message: "Deleted menu item",
	},
});

// Menu Options
handler(router, "/api/v1/menu_options", {
	table: schema.menuOptions,
	list: {
		before: [setUser, adminOnly],
		message: "Found menu options",
	},
	create: {
		before: [setUser, adminOnly],
		fields: ["fileId", "type", "question", "price", "repeatMin", "repeatMax"],
		message: "Created new menu option",
	},
	read: {
		before: [setUser, adminOnly],
		message: "Found menu option",
	},
	update: {
		before: [setUser, adminOnly],
		fields: ["fileId", "type", "question", "price", "repeatMin", "repeatMax"],
		message: "Updated menu option",
	},
	delete: {
		before: [setUser, adminOnly],
		soft: false,
		message: "Deleted menu option",
	},
});

// Orders
handler(router, "/api/v1/orders", {
	table: schema.orders,
	list: {
		before: [setUser, adminOnly],
		message: "Found orders",
	},
	create: {
		before: [setUser, adminOnly],
		fields: ["subtotal"],
		message: "Created new order",
	},
	read: {
		before: [setUser, adminOnly],
		message: "Found order",
	},
	update: {
		before: [setUser, adminOnly],
		fields: ["subtotal", "tax", "total"],
		message: "Updated order",
	},
	delete: {
		before: [setUser, adminOnly],
		soft: true,
		message: "Deleted order",
	},
});

// Order Items
handler(router, "/api/v1/order_items", {
	table: schema.orderItems,
	list: {
		before: [setUser, adminOnly],
		message: "Found order items",
	},
	create: {
		before: [setUser, adminOnly],
		fields: ["orderId", "menuItemId", "quantity", "instructions"],
		message: "Created new order item",
	},
	read: {
		before: [setUser, adminOnly],
		message: "Found order item",
	},
	update: {
		before: [setUser, adminOnly],
		fields: ["orderId", "menuItemId", "quantity", "unitPrice", "instructions"],
		message: "Updated order item",
	},
	delete: {
		before: [setUser, adminOnly],
		soft: false,
		message: "Deleted order item",
	},
});

function temp_email(
	message: schema.Message,
	link: schema.Link,
) {
	const code = Uuid.fromBytes(link.id).toString();
	return {
		html: (tag("html", { "lang": "en" },
			tag("head", {},
				tag("title", {}, "Coop's Pizzeria"),
			),
			tag("body", { "style": "margin: 0; border-radius: 10px; background: black; color: white; text-align: center;" },
				tag("div", {},
					tag("img", {
						"src": X_OPTIONS.BASE_URL + "/images/logo.png",
						"alt": "Coop's Pizzeria Logo",
						"style": "display: block; margin: 0 auto; width: 100%; max-width: 400px;",
					}),
					tag("h1", {}, "Taste The Difference"),
				),
				tag("div", {},
					tag("p", {}, message.textbody),
					tag("img", {
						"src": X_OPTIONS.S3_BUCKET_URL + "/" + message.fileId,
						"alt": "Newsletter Image",
						"style": "display: block; margin: 0 auto; width: 100%; max-width: 700px;",
					}),
				),
				tag("div", {},
					tag("p", {}, X_OPTIONS.LOCATION),
					tag("p", {}, "Open " + X_OPTIONS.HOURS_OPEN + ", Closed " + X_OPTIONS.HOURS_CLOSED),
					tag("p", {}, X_OPTIONS.PHONE),
					tag("a", {
						"href": X_OPTIONS.BASE_URL + "/newsletter/" + code,
						"style": "display: block; color: inherit;",
					}, "Click to view this email as a web page"),
					tag("a", {
						"href": X_OPTIONS.BASE_URL + "/confirm/" + code,
						"style": "display: block; color: inherit;",
					}, "Click to unsubscribe"),
				),
			),
		)).toString(),
		text: `Coop's Pizzeria

${X_OPTIONS.LOCATION}
Open ${X_OPTIONS.HOURS_OPEN}, Closed ${X_OPTIONS.HOURS_CLOSED}
${X_OPTIONS.PHONE}

${message.subject}
${message.textbody}

Click to view this email as a web page:
${X_OPTIONS.BASE_URL}/newsletter/${code}

Click to unsubscribe:
${X_OPTIONS.BASE_URL}/confirm/${code}
`,
	};
}
