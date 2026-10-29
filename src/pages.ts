
import { html, StatusError } from "itty-router";
import * as d from "drizzle-orm";
import { Node, tag, Uuid, redirect } from "webutils";

import { checkRole } from "./utils";
import * as schema from "./schema";
import { filesHandler, loginForm, registerForm, subscribeForm, unsubscribeForm } from "./apis";
import { createSetUser, RequestDb, RequestUser, routerHtml, setDb } from "./context";
import { X_OPTIONS } from "./index";

interface Details {
	title?: string;
	url?: string;
	hero_type?: "full" | "links" | "none";
}

/**
 * Default website page
 *
 * @param children Array of HTML Nodes
 * @returns Html HTML Element
 */
export function Page(details: Details, ...children: Node[]): Response {
	const title = (details.title ? details.title + " | " : "") + "Coop's Pizzeria";
	const url = X_OPTIONS.BASE_URL + details.url;

	return html("<!DOCTYPE html>" + tag("html", { "lang": "en" },
		tag("head", {},
			// page config
			tag("meta", { "charset": "utf-8" }),
			tag("meta", { "name": "viewport", "content": "width=device-width, initial-scale=1" }),
			tag("link", { "rel": "canonical", "href": url }),
			tag("link", {
				"rel": "icon",
				"type": "image/png",
				"sizes": "32x32",
				"href": "/images/" + X_OPTIONS.PHOTO_FAVICON,
			}),
			tag("link", {
				"rel": "apple-touch-icon",
				"sizes": "180x180",
				"href": "/images/" + X_OPTIONS.PHOTO_FAVICON_APPLE,
			}),
			// social sharing
			tag("title", {}, title),
			tag("meta", { "name": "description", "content": X_OPTIONS.DESCRIPTION }),
			tag("meta", { "property": "og:title", "content": title }),
			tag("meta", { "property": "og:description", "content": X_OPTIONS.DESCRIPTION }),
			tag("meta", { "property": "og:url", "content": url }),
			tag("meta", { "property": "og:type", "content": "website" }),
			// stylesheets
			tag("link", { "rel": "stylesheet", "href": "/css/normalize.css" }),
			tag("link", { "rel": "stylesheet", "href": "/css/skeleton.css" }),
			tag("link", { "rel": "stylesheet", "href": "/css/style.css" }),
		),
		tag("body", {},
			(() => {
				const headers = tag("div", { "id": "headers" },
					tag("p", {}, "Phone: " + X_OPTIONS.PHONE),
					tag("p", {}, "Location: " + X_OPTIONS.LOCATION),
					tag("p", {}, "Hours: Open " + X_OPTIONS.HOURS_OPEN + ", Closed " + X_OPTIONS.HOURS_CLOSED),
				);
				const links = tag("div", { "id": "links" },
					tag("a", { "href": "/" }, "Home"),
					tag("a", { "href": "/menu/home" }, "Menu"),
					tag("a", { "href": "/account/dashboard" }, "Rewards"),
				);
				// option: none
				if (details.hero_type === "none") {
					return tag("div", {});
				}
				// option: headers, large logo, slogan, links
				if (details.hero_type === "full") {
					return tag("div", {},
						headers,
						tag("div", { "id": "hero" },
							tag("img", {
								"src": X_OPTIONS.S3_BUCKET_URL + X_OPTIONS.PHOTO_LOGO,
								"alt": "Coop's Pizzeria Logo",
							}),
							tag("h1", {}, "Taste The Difference"),
						),
						links,
					);
				}
				// default: small logo, headers, links
				return tag("div", { "class": "row" },
					tag("div", { "class": "two columns offset-by-one" },
						tag("img", {
							"src": X_OPTIONS.S3_BUCKET_URL + X_OPTIONS.PHOTO_LOGO,
							"alt": "Coop's Pizzeria Logo",
							"class": "u-full-width",
						}),
					),
					tag("div", { "class": "six columns" },
						headers,
						links,
					),
				);
			})(),
			tag("hr", {}),
			tag("div", { "id": "entry" },
				...children,
			),
			tag("hr", {}),
			tag("div", { "id": "footer" },
				tag("p", {}, "Copyright &copy; 2026 Cooper's Pizzeria \"Coop's Pizzeria\""),
				tag("p", {}, "Site built by Seth Cooper"),
			),
		)
	));
}

routerHtml.get("/", (req, env, ctx) => {
	const date = (function () {
		function next_thursday(date: Date) {
			let a = 4 - date.getDay(); // days til thursday
			if (a < 0) a = 7 + a; // fix friday-sunday
			return new Date(date.getTime() + 24 * 60 * 60 * 1000 * a);
		}

		const a = new Date();
		const b = next_thursday(a);
		const f = Math.ceil(b.getDate() / 7);
		let d = new Date(b.getTime());
		if (f === 2) d.setDate(b.getDate() + 7);
		if (f >= 4) {
			let e = new Date(b.getFullYear(), b.getMonth() + 1, 1);
			d = next_thursday(e);
		}
		return d.toLocaleDateString("en-US", {
			month: "long",
			day: "numeric",
		});
	})();

	return Page({
		title: undefined,
		hero_type: "full",
		url: "/"
	},
		tag("div", { "id": "menu", "class": "row" },
			tag("div", { "class": "one-third column" },
				tag("h3", {}, "Lunch Menu"),
				tag("p", {}, "11AM - 3PM"),
				tag("a", { "href": "/menu/lunch" },
					tag("img", { "src": "/images/menu_lunch.jpg", "alt": "Lunch Menu" }),
				),
			),
			tag("hr", {}),
			tag("div", { "class": "one-third column" },
				tag("h3", {}, "Dinner Menu"),
				tag("p", {}, "3PM - Closing"),
				tag("a", { "href": "/menu/dinner" },
					tag("img", { "src": "/images/menu_dinner.jpg", "alt": "Dinner Menu" }),
				),
			),
			tag("hr", {}),
			tag("div", { "class": "one-third column" },
				tag("h3", {}, "Specials Menu"),
				tag("p", {}, "Daily"),
				tag("a", { "href": "/menu/specials" },
					tag("img", { "src": "/images/menu_specials.jpg", "alt": "Specials Menu" }),
				),
			),
		),
		tag("hr", {}),
		tag("div", { "id": "newsletter" },
			tag("div", {},
				tag("img", { "src": "/images/starburst.png", "alt": "Newsletter Starburst" }),
				tag("h3", {}, "Subscribe to our Newsletter!"),
			),
			subscribeForm.render({ submit_text: "Join" }),
		),
		tag("hr", {}),
		((list) => tag("div", { "id": "photos" },
			...list.map(([link, alt], i) => tag("img", {
				"src": "/images/" + link,
				"alt": alt,
			})),
		))(X_OPTIONS.PHOTOS_FOOD),
		tag("hr", {}),
		tag("div", { "id": "openmic" },
			tag("div", {},
				tag("h1", {}, "- Open Mic Night -"),
				tag("h5", {}, "Hosted by Salina's Randy Baldwin"),
				tag("h3", {}, date),
				tag("h6", {}, "Every 1st & 3rd Thursday Night from 6-9PM"),
				tag("p", {}, "You can't beat good music and great pizza"),
				tag("p", {}, "Musicians come in, sign up, and play free open mic!"),
			),
			tag("div", { "class": "row" },
				tag("img", {
					"src": "/images/open_mic_1.jpg",
					"alt": "Open Mic Night",
					"class": "one-half column"
				}),
				tag("img", {
					"src": "/images/open_mic_2.jpg",
					"alt": "Open Mic Night",
					"class": "one-half column"
				}),
			),
		),
		tag("hr", {}),
		tag("div", { "id": "location" },
			tag("h1", {}, "- Come Grab A Pizza Pie -"),
			tag("h5", {}, "Location: " + X_OPTIONS.LOCATION),
			tag("h5", {}, "Hours: Open " + X_OPTIONS.HOURS_OPEN + ", Closed " + X_OPTIONS.HOURS_CLOSED),
			tag("h5", {},"Phone: " + X_OPTIONS.PHONE),
		),
		tag("hr", {}),
		tag("div", { "id": "about" },
			tag("div", {},
				tag("p", {}, "Our slogan \"Taste The Difference!\" is what we strive for everyday. One thing is for sure, this will be some of the best food you will ever eat!"),
				tag("p", {}, "All homemade dough, sauces, and dressings combined with the best ingredients separates us from the competition."),
			),
		),
		tag("div", { "id": "grubhub" },
			tag("a", { "href": X_OPTIONS.GRUBHUB_URL },
				tag("div", { "class": "phone" },
					tag("p", {}, "Takeout/Delivery"),
					tag("img", { "src": "/images/grubhub.png", "height": "30px", "alt": "Grubhub Logo" }),
				),
				tag("div", { "class": "large" },
					tag("p", {}, "Order Takeout or Delivery"),
					tag("img", { "src": "/images/grubhub.png", "height": "60px", "alt": "Grubhub Logo" }),
				),
			),
		),
	); // returns Page
});

routerHtml.get("/menu", (req, env, ctx) => redirect("/menu/home"));

routerHtml.get<RequestDb>("/menu/:category+", setDb, async (req, env, ctx) => {
	const category = req.params["category"];
	const isHome = category === "home";

	let current: schema.Category | undefined;
	let children: schema.Category[];
	let items: schema.MenuItem[] = [];

	if (isHome) {
		children = await req.db
			.select()
			.from(schema.categories)
			.where(d.isNull(schema.categories.parentId));
	} else {
		// `:category+` can match "a/b", so use the last segment as the name
		const name = category.split("/").pop()!;

		[current] = await req.db
			.select()
			.from(schema.categories)
			.where(d.eq(schema.categories.name, name))
			.limit(1);

		if (!current) return new Response("Category not found", { status: 404 });

		children = await req.db
			.select()
			.from(schema.categories)
			.where(d.eq(schema.categories.parentId, current.id));

		items = await req.db
			.select()
			.from(schema.menuItems)
			.where(d.eq(schema.menuItems.categoryId, current.id));
	}

	// first two levels of the tree for the sidebar
	const roots = await req.db
		.select()
		.from(schema.categories)
		.where(d.isNull(schema.categories.parentId));

	const subs = roots.length
		? await req.db
				.select()
				.from(schema.categories)
				.where(d.inArray(schema.categories.parentId, roots.map((r) => r.id)))
		: [];

	return Page({},
		tag("h1", {}, category),
		tag("div", { "class": "row" },
			tag("div", { "class": "three columns" },
				tag("ul", {},
					...roots.map((root) =>
						tag("li", {},
							tag("a", { href: `/menu/${root.name}` }, root.name),
							tag("ul", {},
								...subs
									.filter((s) => s.parentId === root.id)
									.map((s) =>
										tag("li", {},
											tag("a", { href: `/menu/${s.name}` }, s.name),
										),
									),
							),
						),
					),
				),
			),
			tag("div", { "class": "nine columns" },
				tag("ul", {},
					...children.map((c) =>
						tag("li", {}, tag("a", { href: `/menu/${c.name}` }, c.name)),
					),
				),
				...(items.length
					? [
							tag("ul", {},
								...items.map((item) => tag("li", {}, item.name)),
							),
						]
					: []),
			),
		),
	);
});

routerHtml.get<RequestDb>("/newsletter/:id_link", setDb, async (req, env, ctx) => {
	// params
	const id_link = Uuid.fromString(req.params["id_link"]);

	// database calls
	const result = await req.db
  	.select({ ...d.getTableColumns(schema.messages) })
  	.from(schema.messages)
  	.innerJoin(schema.links, d.eq(schema.messages.id, schema.links.messageId))
		.where(d.eq(
			schema.links.id,
			Buffer.from(id_link.toBytes()),
		))
  	.limit(1)
  	.get();
	if (!result) {
		throw new StatusError(404);
	}

	// view newsletter
	return Page({ title: "Newsletter" },
		tag("img", { "src": X_OPTIONS.S3_BUCKET_URL + result.fileId, "alt": "Newsletter Image" }),
		tag("h2", {}, result.subject),
		tag("p", {}, result.textbody),
		tag("a", { "href": "/confirm/" + id_link }, "Click to Unsubscribe"),
	);
});

routerHtml.get("/confirm/:id_link", (req, env, ctx) => {
	const id_link = req.params["id_link"];
	return Page({ title: "Newsletter" },
		tag("h2", {}, "Unsubscribe From Our Newsletter"),
		unsubscribeForm
			.render({ submit_text: "Click to Unsubscribe" })
			.childrenAppend(tag("input", { "type": "text", "name": "id_link", "value": id_link, "hidden": "" })),
	);
});

routerHtml.get("/account", (req, env, ctx) => redirect("/account/dashboard"));

routerHtml.get("/account/login", (req, env, ctx) => {
	return Page({ title: "Login" },
		tag("h1", {}, "Login"),
		tag("a", { "href": "/account/register" }, "Register instead?"),
		loginForm.render({ submit_text: "Login" }),
	);
});

routerHtml.get("/account/register", (req, env, ctx) => {
	return Page({ title: "Register" },
		tag("h1", {}, "Register"),
		tag("a", { "href": "/account/login" }, "Login instead?"),
		registerForm.render({ submit_text: "Register" }),
	);
});

routerHtml.get<RequestUser>(
	"/account/dashboard",
	createSetUser(() => redirect("/account/login")),
	(req, env, ctx) => {
		return Page({ title: "Account" },
			tag("h1", {}, "Account Dashboard"),
		);
	}
);

routerHtml.get<RequestUser>(
	"/account/admin",
	createSetUser(() => {
		throw new StatusError(404);
	}),
	(req, env, ctx) => {
		if (checkRole(req.user, schema.Role.Admin)) {
			// Show admin dashboard
			return Page({ title: "Dashboard" },
				tag("h1", {}, "Admin Dashboard"),
				filesHandler.renderAll() as unknown as Node,
			);
		}
		throw new StatusError(404);
	}
);
