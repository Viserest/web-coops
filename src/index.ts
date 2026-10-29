
import { errorPage, reply } from "webutils";
import { ownsPath } from "webutils/router";

import { routerApi, routerHtml } from "./context";
import "./pages";
import "./apis";

export const X_OPTIONS = {
	// urls
	BASE_URL: "https://coopspizzeria.com/",
	BASE_WWW_URL: "https://www.coopspizzeria.com/",
	S3_BUCKET_URL: "https://s3.coopspizzeria.com/",
	GRUBHUB_URL: "https://www.grubhub.com/restaurant/coops-pizzeria-1219-w-crawford-st-salina/10391280" +
		"?utm_source=coopspizzeria&amp;utm_medium=content_owned&amp;utm_campaign=menushare&amp;utm_content=share-link",
	// config
	SESSION_COOKIE_NAME: "session_id",
	SESSION_COOKIE_EXPIRE: 6 * 60 * 60, // 6hrs
	EMAIL: "Coop's Pizzeria <news@coopspizzeria.com>",
	// information
	PHONE: "+1 785-823-5556",
	LOCATION: "1219A W. Crawford St, Salina, KS",
	HOURS_OPEN: "Monday-Saturday 11AM-8PM",
	HOURS_CLOSED: "Sunday",
	DESCRIPTION: "Come Grab A Pizza Pie! " +
		"Coop's Pizzeria in Salina, Kansas. " +
		"Pizza, Salads, Calzone's, Wings, and Sandwiches. " +
		"Homemade Dough, Sauces, and Dressings. " +
		"Dine-in or Carry-out.",
	// src: "/images/[0]", alt: [1]
	PHOTO_LOGO: "logo.png",
	PHOTO_FAVICON: "favicon.png",
	PHOTO_FAVICON_APPLE: "favicon-apple.png",
	PHOTOS_FOOD: [
		["mexican_pizza.png", "Mexican Pizza"],
	  ["wings_tray.png", "Wings on tray"],
	  ["deepdish.png", "Deep Dish Pizza"],
	  ["pepperoni.png", "Pepperoni Pizza"],
	  ["salad.jpg", "Salad"],
	  ["sandwich.jpg", "Sandwich"],
	  ["wings_mesh.jpg", "Wings on mesh"],
		["pasta.jpg", "Pasta"],
	],
	PHOTOS_OPENMIC: [
		["open_mic_1.png", "Open Mic 1"],
		["open_mic_2.png", "Open Mic 2"],
	],
};

export default {
	async fetch(req, env, ctx) {
		// First router that has a route for this path wins. Unmatched paths go to the
		// HTML router, so they get the HTML 404 page.
		const api = !ownsPath(routerHtml, req) && ownsPath(routerApi, req);
		try {
			return await (api ? routerApi : routerHtml).fetch(req, env, ctx);
		} catch (err) {
			console.error(err);
			if (api) return reply("Internal server error", 500);
			try {
				return errorPage(500, req);
			} catch (err2) {
				console.error(err2);
				return new Response("Internal server error", { status: 500 });
			}
		}
	},
} satisfies ExportedHandler<Env>;
