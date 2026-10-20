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
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export const X_OPTIONS = {
	// urls
	BASE_URL: "https://coopspizzeria.com",
	BASE_WWW_URL: "https://www.coopspizzeria.com",
	S3_BUCKET_URL: "https://s3.coopspizzeria.com",
	GRUBHUB_URL: "https://www.grubhub.com/restaurant/coops-pizzeria-1219-w-crawford-st-salina/10391280" +
		"?utm_source=coopspizzeria&amp;utm_medium=content_owned&amp;utm_campaign=menushare&amp;utm_content=share-link",
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
	// src: "/static/images/[0]", alt: [1]
	PHOTOS_FOOD: [["mexican_pizza.png", "Mexican Pizza"],
	  ["wings_tray.png", "Wings on tray"],
	  ["deepdish.png", "Deep Dish Pizza"],
	  ["pepperoni.png", "Pepperoni Pizza"],
	  ["salad.jpg", "Salad"],
	  ["sandwich.jpg", "Sandwich"],
	  ["wings_mesh.jpg", "Wings on mesh"],
	  ["pasta.jpg", "Pasta"]],
	PHOTOS_OPENMIC: [],
	// cookie name
	SESSION_COOKIE_NAME: "session_id",
};

export function now_s(): number {
	return Math.floor(Date.now() / 1000);
}

export function get_cookie(request: Request | Response, name: string): string | null {
	const cookies = request.headers.get("cookie");
	if (!cookies) return null;

	for (const part of cookies.split(";")) {
		const [key, ...value] = part.trim().split("=");
		if (key === name) {
			return decodeURIComponent(value.join("="));
		}
	}
	return null;
}

export const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

export function getDb(env: Env) {
  return drizzle(env.DB, { schema });
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
