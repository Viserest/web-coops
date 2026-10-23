
import { form, tag } from "./tag";

type FieldDef = {
	type: "text" | "email" | "password";
	placeholder?: string;
	optional?: true; // fields are required unless marked optional
};
type Fields = Record<string, FieldDef>;

// Builds { name: string, email: string, password: string } from the field definitions
export type Infer<F extends Fields> =
	{ [K in keyof F as F[K] extends { optional: true } ? never : K]: string } &
	{ [K in keyof F as F[K] extends { optional: true } ? K : never]?: string };

type ParseResult<T> =
	| { ok: true; data: T }
	| { ok: false; error: string };

export function defineForm<const F extends Fields>(def: {
	href: string;
	method: "POST" | "PUT" | "PATCH" | "DELETE";
	fields: F;
}) {
	const { href, method, fields } = def;
	type Data = Infer<F>;

	return {
		href,
		method,
		fields,

		// Frontend: the same HTML your current form() call produces
		render(pla: {
			submit_text?: string,
			message_text?: string,
		}) {
			return form(
				{ href, method, submit_text: pla.submit_text, message_text: pla.message_text },
				...Object.entries(fields).map(([name, f]) =>
					tag("input", {
						type: f.type,
						name,
						...(f.placeholder && { placeholder: f.placeholder }),
						...(!f.optional && { required: "" }),
					}),
				),
			);
		},

		// Backend: validate an already-parsed body
		parse(body: unknown): ParseResult<Data> {
			if (typeof body !== "object" || body === null) {
				return { ok: false, error: "Body must be an object" };
			}
			const input = body as Record<string, unknown>;
			const out: Record<string, string> = {};
			const bad: string[] = [];

			for (const [name, f] of Object.entries(fields)) {
				const v = input[name];
				if (v === undefined || v === "") {
					if (!f.optional) bad.push(name);
				} else if (typeof v !== "string") {
					bad.push(name);
				} else {
					out[name] = v;
				}
			}

			if (bad.length) return { ok: false, error: `Missing or invalid: ${bad.join(", ")}` };
			return { ok: true, data: out as Data };
		},

		// Backend: parse JSON from the request, then validate
		async parseRequest(req: Request): Promise<ParseResult<Data>> {
			let body: unknown;
			try {
				body = await req.json();
			} catch {
				return { ok: false, error: "Invalid JSON" };
			}
			return this.parse(body);
		},
	};
}
