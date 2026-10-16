
import { router, Page, LOCATION, HOURS_OPEN, HOURS_CLOSED, PHONE, S3_BUCKET_LINK } from "./index";
import { html, json } from "itty-router";
import { a, form, img, input, tag } from "./tag";
import { now_s } from "./common";
import { Message } from "./schema";
import { Uuid } from "./uuid";

const GRUBHUB_LINK = "https://www.grubhub.com/restaurant/coops-pizzeria-1219-w-crawford-st-salina/10391280?utm_source=coopspizzeria&amp;utm_medium=content_owned&amp;utm_campaign=menushare&amp;utm_content=share-link";

router.get("/", (req, env, ctx) => {
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

	return html(Page(
		tag("div",
			tag("div",
				tag("h2", "Lunch Menu"),
				tag("p", "11AM - 3PM"),
				a("/menu/lunch",
					img("/static/images/menu_lunch.jpg").attr("alt", "Lunch Menu"),
				),
			),
			tag("i"),
			tag("div",
				tag("h2", "Dinner Menu"),
				tag("p", "3PM - Closing"),
				a("/menu/dinner",
					img("/static/images/menu_dinner.jpg").attr("alt", "Dinner Menu"),
				),
			),
			tag("i"),
			tag("div",
				tag("h2", "Specials Menu"),
				tag("p", "Daily"),
				a("/menu/specials",
					img("/static/images/menu_specials.jpg").attr("alt", "Specials Menu"),
				),
			),
		).attr("id", "menu"),
		tag("i"),
		tag("div",
			tag("div",
				tag("/static/images/starburst.png").attr("alt", "Newsletter Starburst"),
				tag("h1", "Subscribe to our Newsletter!"),
			),
			form({
				href: "/api/subscribe",
				method: "POST",
				submit_text: "Join",
			},
				input("text").attrs({ "name": "name", "placeholder": "John Smith", "required": "" }),
				input("email").attrs({ "name": "email", "placeholder": "john@smith.com", "required": "" }),
			),
		).attr("id", "newsletter"),
		tag("i"),
		((list) => tag("div",
			...list.map(([link, alt]) => img("/static/images/" + link).attr("alt", alt)),
		).attr("id", "photos"))([
			["mexican_pizza.png", "Mexican Pizza"],
			["wings_tray.png", "Wings on tray"],
			["deepdish.png", "Deep Dish Pizza"],
			["pepperoni.png", "Pepperoni Pizza"],
			["salad.jpg", "Salad"],
			["sandwich.jpg", "Sandwich"],
			["wings_mesh.jpg", "Wings on mesh"],
			["pasta.jpg", "Pasta"],
		]),
		tag("i"),
		tag("div",
			tag("div",
				tag("h1", "- Open Mic Night -"),
				tag("h1", date),
				tag("h3", "Every 1st & 3rd Thursday Night from 6-9PM"),
				tag("h4", "You can't beat good music and great pizza", tag("br"), "Musicians come in, sign up, and play free open mic!"),
				tag("h2", "Hosted by Salina's Randy Baldwin"),
			),
			tag("div",
				img("/static/images/open_mic_1.jpg").attr("id", "Open Mic Night"),
				img("/static/images/open_mic_2.jpg").attr("id", "Open Mic Night"),
			),
		).attr("id", "openmic"),
		tag("i"),
		tag("div",
			tag("h1", "Come Grab A Pizza Pie!"),
			tag("p", "Location: " + LOCATION),
			tag("p", "Hours: Open " + HOURS_OPEN + ", Closed " + HOURS_CLOSED),
			tag("p", "Phone: " + PHONE),
		).attr("id", "location"),
		tag("i"),
		tag("div",
			tag("div",
				tag("p", "Our slogan \"Taste The Difference!\" is what we strive for everyday. One thing is for sure, this will be some of the best food you will ever eat!"),
				tag("p", "All homemade dough, sauces, and dressings combined with the best ingredients separates us from the competition."),
			),
		).attr("id", "about"),
		tag("div",
			a(GRUBHUB_LINK,
				tag("div",
					tag("p", "Takeout/Delivery"),
					img("/static/images/grubhub.png").attrs({ "height": "30px", "alt": "Grubhub Logo" }),
				).attr("class", "phone"),
				tag("div",
					tag("p", "Order Takeout or Delivery"),
					img("/static/images/grubhub.png").attrs({ "height": "60px", "alt": "Grubhub Logo" }),
				).attr("class", "large"),
			),
		).attr("id", "grubhub"),
	)); // returns html
});

router.get("/menu/:name", (req, env, ctx) => {
	const name = req.params["name"];
	// Invalid menu name
	if (!["lunch", "dinner", "specials"].includes(name)) {
		return html(Page(
			tag("h2", "Not Found!"),
			tag("p", name, "Menu is invalid or not found."),
		));
	}
	// Valid menu name
	return html(Page(
		img("/static/images/menu_" + name + ".png").attrs({ "alt": name + "Menu", "id": "menu_image" }),
	));
});

router.get("/newsletter/:id_link", async (req, env, ctx) => {
	const id_link = req.params["id_link"];
	const message: Message | null = await env.DB
		.prepare("SELECT message JOIN links ON message.id = links.message_id WHERE link.id = ? LIMIT 1")
		.bind(id_link)
		.first();
	if (message === null) {
		return html(Page(
			tag("h1", "Not Found!"),
			tag("p", "This is not the message you are looking for"),
		));
	}

	return html(Page(
		img(S3_BUCKET_LINK + message.file_id).attr("alt", "Newsletter Image"),
		tag("h2", message.subject),
		tag("p", message.text),
		a("/confirm/" + id_link, "Click to Unsubscribe"),
	));
});

router.get("/confirm/:id_link", (req, env, ctx) => {
	const id_link = req.params["id_link"];
	return html(Page(
		tag("h2", "Unsubscribe From"),
		tag("h2", "Our Newsletter"),
		form({
			href: "/api/unsubscribe",
			method: "POST",
			submit_text: "Click to Unsubscribe",
		},
			input("text").attrs({ "value": id_link, "hidden": "" }),
		),
	));
});



router.post("/api/subscribe", async (req, env, ctx) => {
	const data: { name: string | null, email: string | null } = await req.json();

	// Name field
	const name = data["name"];
	if (name === null) return json({ "message": "Name field is required" });
	if (!/^[a-zA-Z ]+$/.test(name)) return json({ "message": "Name field is invalid" });

	// Email field
	const email = data["email"];
	if (email === null) return json({ "message": "Email field is required" });
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ "message": "Email field is invalid" });

	// Save it
	const client_ip = req.headers.get("cf-connecting-ip");
	const result = await env.DB
		.prepare("INSERT INTO subscriber (id, created_at, email, name, ip_addr) VALUES (?, ?, ?, ?, ?)")
		.bind(Uuid.randomv4(), now_s(), email, name, client_ip)
		.run();
	if (!result.success) return json({ "message": "Error subscribing" });

	return json({ "message": "Congrats! You're now subscribed!" });
});



router.post("/api/unsubscribe", async (req, env, ctx) => {
	const data: { id_link: string | null } = await req.json();
	const id_link = data["id_link"];
	if (id_link === null) return json({ "message": "id_link field is required" });

	const result = await env.DB
		.prepare(`UPDATE subscriber
		  JOIN link ON subscriber.id = link.subscriber_id
		  SET subscriber.deleted_at = ?
		  WHERE link.id = ?`)
		.bind(now_s(), id_link)
		.run();
	if (!result.success) return json({ "message": "Error unsubscribing" });

	return json({ "message": "Now unsubscribed" });
});
