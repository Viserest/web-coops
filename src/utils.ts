
import { json } from "itty-router";
import { drizzle } from "drizzle-orm/d1";
import { lt, sql } from "drizzle-orm";

import * as schema from "./schema";
import { HandlerContext } from "./handler";
import { Bindings, Db } from "./context";

export function nowSecs(): number {
	return Math.floor(Date.now() / 1000);
}

export function getCookie(request: Request | Response, name: string): string | null {
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

export const toInt = (v: unknown, fallback: number): number => {
	const raw = Array.isArray(v) ? v[0] : v;
	if (raw === undefined || raw === "") return fallback;
	const n = Number(raw);
	return Number.isInteger(n) && n >= 0 ? n : fallback;
};

// verification stuff

export const isAsciiOrSpace = (v: string): boolean => {
	return /^[a-zA-Z ]+$/.test(v);
}

/** Check if v is a valid email */
export const isEmail = (v: string): boolean => {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export const checkRole = (user: schema.User, role: schema.Role) =>
	user && user.role === role;

export const adminOnly = (c: HandlerContext) => checkRole(c.req.user, schema.Role.Admin);

// database stuff

export const createDb = (env: Bindings): Db => drizzle(env.DB, { schema });

// response stuff

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

// password stuff

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

// cron job stuff

export async function purgeExpiredSessions(db: Db) {
	await db.delete(schema.sessions)
		.where(lt(schema.sessions.expiresAt, sql`unixepoch()`));
}
