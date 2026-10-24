
import { IRequest, json } from "itty-router";
import { drizzle } from "drizzle-orm/d1";
import * as d from "drizzle-orm";

import * as schema from "./schema";
import { Bindings, Db, RequestUser } from "./context";

//
// Nice return types
//

export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export type Option<T> =
  | { some: true; value: T }
  | { some: false };

export function Some<T>(value: T): Option<T> {
  return { some: true, value };
}

export function None(): Option<never> {
  return { some: false };
}

//
// Helper stuff
//

/** Get unix epoch in seconds */
export function nowSecs(): number {
	return Math.floor(Date.now() / 1000);
}

/** Get cookie name from headers */
export function getCookie(headers: Headers, name: string): Result<string> {
	const cookies = headers.get("cookie");
	if (!cookies) return Err("Cookie header is not found.");

	for (const part of cookies.split(";")) {
		const [key, ...value] = part.trim().split("=");
		if (key === name) {
			return Ok(decodeURIComponent(value.join("=")));
		}
	}
	return Err("Cookie name not found");
}

export const toInt = (v: unknown, fallback: number): number => {
	const raw = Array.isArray(v) ? v[0] : v;
	if (raw === undefined || raw === "") return fallback;
	const n = Number(raw);
	return Number.isInteger(n) && n >= 0 ? n : fallback;
};

//
// verification stuff
//

const ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};
export const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Check if v is ascii or space */
export const isAsciiOrSpace = (v: string): boolean => {
	return /^[a-zA-Z ]+$/.test(v);
}

/** Check if v is a valid email */
export const isEmail = (v: string): boolean => {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export const checkRole = (user: schema.User, role: schema.Role) =>
	user && user.role === role;

export const adminOnly = (req: RequestUser) =>
	checkRole(req.user, schema.Role.Admin);

/** Copy only the allowed keys out of an untrusted JSON body */
export function parseToObject<Data = Record<string, unknown>>(
	body: unknown,
	keysRequired: string[],
	keysOptional: string[] = [],
): Result<Data> {
	// If the body is null, not an object, or is an array
	if (body === null || typeof body !== "object" || Array.isArray(body))
		return Err("Body is not an object");

	const input = body as Record<string, unknown>;
	const out: Record<string, unknown> = {};
	const bad: string[] = [];

	// If body contains a key in keys, then keep it
	for (const k of keysRequired) {
		// required key is in input
		if (k in input) { out[k] = input[k] }
		// required key is NOT in input
		else { bad.push(k) }
	}
	for (const k of keysOptional) if (k in input) out[k] = input[k];

	if (bad.length) return Err(`Missing or invalid: ${bad.join(", ")}`);
	return Ok(out as Data);
};

//
// database stuff
//

export const createDb = (env: Bindings): Db => drizzle(env.DB, { schema });

//
// response stuff
//

export const reply = (message: string, status: number, extra: Record<string, unknown> = {}) =>
	json({
		is_error: status <= 200 && status > 300,
		message,
		...extra
	}, { status });

export const redirect = (url: string) =>
	new Response(null, {
		status: 303,
		headers: { location: url },
	});

//
// password stuff
//

const PBKDF2_ITERATIONS = 100_000;

export function toBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);

	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

export function fromBase64Url(s: string): Uint8Array {
	const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
	const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

async function derive(
	password: string,
	salt: Uint8Array,
	iterations: number,
): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(password),
		"PBKDF2",
		false,
		["deriveBits"],
	);
	const bits = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", hash: "SHA-256", salt, iterations },
		key,
		256,
	);
	return new Uint8Array(bits);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const derived = await derive(password, salt, PBKDF2_ITERATIONS);
	return [
		"pbkdf2-sha256",
		PBKDF2_ITERATIONS,
		toBase64Url(salt),
		toBase64Url(derived),
	].join("$");
}

export async function verifyPassword(
	password: string,
	stored: string,
): Promise<boolean> {
	const parts = stored.split("$");
	if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256") return false;

	const iterations = Number(parts[1]);
	if (!Number.isInteger(iterations) || iterations < 1 || iterations > 1_000_000) {
		return false;
	}

	let salt: Uint8Array, expected: Uint8Array;
	try {
		salt = fromBase64Url(parts[2]);
		expected = fromBase64Url(parts[3]);
	} catch {
		return false;
	}

	const actual = await derive(password, salt, iterations);
	return timingSafeEqual(actual, expected);
}

// Lets callers upgrade old hashes after a successful login
export function needsRehash(stored: string): boolean {
	const parts = stored.split("$");
	return parts[0] !== "pbkdf2-sha256" || Number(parts[1]) < PBKDF2_ITERATIONS;
}

//
// cron job stuff
//

export async function purgeExpiredSessions(db: Db) {
	await db.delete(schema.sessions)
		.where(d.lt(schema.sessions.expiresAt, d.sql`unixepoch()`));
}
