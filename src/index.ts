/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Router, IRequest } from "itty-router";
import { Node, Element, tag, img } from "./tag";

export const S3_BUCKET_LINK = "https://s3.coopspizzeria.com/";
export const X_GRUBHUB_LINK = "https://www.grubhub.com/restaurant/coops-pizzeria-1219-w-crawford-st-salina/10391280" +
	"?utm_source=coopspizzeria&amp;utm_medium=content_owned&amp;utm_campaign=menushare&amp;utm_content=share-link";

export const X_PHONE = "+1 785-823-5556";
export const X_LOCATION = "1219A W. Crawford St, Salina, KS";
export const X_HOURS_OPEN = "Monday-Saturday 11AM-8PM";
export const X_HOURS_CLOSED = "Sunday";
export const X_DESCRIPTION = "Come Grab A Pizza Pie! " +
	"Coop's Pizzeria in Salina, Kansas. " +
	"Pizza, Salads, Calzone's, Wings, and Sandwiches. " +
	"Homemade Dough, Sauces, and Dressings. " +
	"Dine-in or Carry-out.";

/**
 * Default website page
 *
 * @param children Array of HTML Nodes
 * @returns Html HTML Element
 */
export function Page(...children: Node[]): Element {
	return tag("html",
		tag("head",
			// page config
			tag("meta").attrs({ "charset": "utf-8" }),
			tag("link").attrs({ "name": "viewport", "content": "width=device-width, initial-scale=1" }),
			tag("link").attrs({ "rel": "canonical", "href": "https://coopspizzeria.com/" }),
			// social sharing
			tag("title", "Coop's Pizzeria"),
			tag("meta").attrs({ "name": "description", "content": X_DESCRIPTION }),
			tag("meta").attrs({ "property": "og:title", "content": "Coop's Pizzeria" }),
			tag("meta").attrs({ "property": "og:description", "content": X_DESCRIPTION }),
			tag("meta").attrs({ "property": "og:url", "content": "https://coopspizzeria.com/" }),
			tag("meta").attrs({ "property": "og:type", "content": "website" }),
			// stylesheets
			tag("link").attrs({ "rel": "stylesheet", "href": "/css/normalize.css" }),
			tag("link").attrs({ "rel": "stylesheet", "href": "/css/skeleton.css" }),
			tag("link").attrs({ "rel": "stylesheet", "href": "/css/style.css" }),
		),
		tag("body",
			tag("div",
				tag("p", "Phone: " + X_PHONE),
				tag("p", "Location: " + X_LOCATION),
				tag("p", "Hours: Open " + X_HOURS_OPEN + ", Closed " + X_HOURS_CLOSED),
			).attr("id", "header"),
			tag("div",
				img("/static/images/logo.png").attr("alt", "Coops Pizzeria Logo"),
				tag("h1", "Taste The Difference"),
			).attr("id", "title"),
			tag("i"),
			tag("div",
				...children,
			).attr("id", "entry"),
			tag("i"),
			tag("div",
				tag("p", "Copyright &copy; 2026 Cooper's Pizzeria \"Coop's Pizzeria\""),
				tag("p", "Site built by Seth Cooper"),
			).attr("id", "footer"),
		),
	).attr("lang", "en_us");
}

export interface Env {
	DB: D1Database,
	IMAGES: R2Bucket,
	EMAIL: SendEmail,
}
export type CFArgs = [Env, ExecutionContext];

export const router = Router<IRequest, CFArgs>();

export default {
	...router
} satisfies ExportedHandler<Env>;
