
import { router, errorPage } from "webutils";

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
		["pasta.jpg", "Pasta"]
	],
	PHOTOS_OPENMIC: [
		["open_mic_1.png", "Open Mic 1"],
		["open_mic_2.png", "Open Mic 2"],
	],
};

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		try {
			return await router.fetch(request, env, ctx);
		} catch (err) {
			// Safety net for anything that escapes the router
			console.error(err);
			return errorPage(500, request);
		}
	},
} satisfies ExportedHandler<Env>;
