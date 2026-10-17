import { IRequest, json } from "itty-router";
import { clamp, now_s } from "./common";
import { Env } from "./index";
import { Uuid } from "./uuid";
import { Pagination } from "./schema";

// LIST API
export async function listHandler<T>(req: IRequest, env: Env, table_name: string) {
	// Get limit and offset
	let limit, offset = 0;
	try {
		let a = req.query.limit;
		if (a == null) throw new Error();
		let b = Number(a);
		limit = clamp(b, 0, 100);
	} catch {
		limit = 20;
	}
	try {
		let a = req.query.offset;
		if (a == null) throw new Error();
		offset = Number(a);
	} catch { }

	// Make database call
	const result = await env.DB
		.prepare(`SELECT * FROM ${table_name} OFFSET ? LIMIT ?`)
		.bind(offset, limit)
		.all<T>();

	// Server error
	if (!result.success) {
		return json({
			"msg": "Problem reading table",
		}, { status: 500 });
	}
	// Results empty
	if (!result.success || result.results.length === 0) {
		return json({
			"msg": "Table is empty",
		}, { status: 204 });
	}
	// Results found
	return json(<Pagination>{
		offset,
		limit,
		total: result.results.length,
		items: result.results,
	}, { "status": 200 });
}

// POST API
export async function postHandler<T>(req: IRequest, callback: (data: T, id: Uuid) => D1PreparedStatement | string, res?: string) {
	const data = await req.json<T>();

	const id = Uuid.randomv4();
	const stmt = callback(data, id);
	if (typeof (stmt) === "string") {
		return json({
			"msg": stmt,
		}, { "status": 500 });
	}
	const result = await stmt.run();
	if (!result.success) {
		return json({
			"msg": "Problem adding to table",
		}, { "status": 500 });
	}

	return json({
		"msg": (res) ? res : "Created",
	}, { "status": 201 });
}

// GET API
export async function getHandler<T>(req: IRequest, env: Env, table_name: string) {
	const id = req.params["id"];
	if (!id) {
		return json({
			"msg": "Id cannot be null",
		}, { "status": 400 });
	}

	// Make database call
	const result = await env.DB
		.prepare(`SELECT * FROM ${table_name} WHERE \`id\` = ? LIMIT 1`)
		.bind(id)
		.run<T>();

	// Problem
	if (!result) {
		return json({
			"msg": "Problem reading table",
		}, { "status": 500 });
	}

	// Empty
	if (result.results.length === 0) {
		return json({
			"msg": "Table is empty",
		}, { "status": 204 });
	}

	// Success
	return json(<T>result.results[0], {
		"status": 200,
	});
}

// PUT API
export async function putHandler<T>(req: IRequest, callback: (data: T, id: any) => D1PreparedStatement | string, res?: string) {
	const id = req.params["id"];
	if (!id) {
		return json({
			"msg": "Id cannot be null",
		}, { "status": 500 });
	}

	const data = await req.json<T>();

	const stmt = callback(data, id);
	if (typeof (stmt) === "string") {
		return json({
			"msg": stmt,
		}, { "status": 500 });
	}
	const result = await stmt.run();

	if (!result.success) {
		return json({
			"msg": "Problem updating album",
		}, { "status": 500 });
	}

	return json({
		"msg": (res) ? res : "Updated",
	}, { "status": 200 });
}

// DELETE API
export async function deleteHandler<T>(req: IRequest, env: Env, table_name: string) {
	const id = req.params["id"];
	if (!id) {
		return json({
			"msg": "Id cannot be null",
		}, { "status": 400 });
	}

	// Check if table has deleted_at column
	const result = await env.DB
		.prepare(`SELECT EXISTS (
    	SELECT 1
      FROM pragma_table_info(\`${table_name}\`)
      WHERE name = \`deleted_at\`
    );`)
		.first<number>();
	if (!result) {
		return json({
			"msg": "Problem deleting",
		}, { "status": 500 });
	}

	// Either set deleted_at column or actually delete
	const result2 = await (result === 1 ?
		env.DB
			.prepare(`UPDATE ${table_name} SET \`deleted_at\` = ? WHERE \`id\` = ?`)
			.bind(now_s(), id)
		: env.DB
			.prepare(`DELETE FROM ${table_name} WHERE \`id\` = ?`)
			.bind(id)
		)
		.run();

	if (!result2.success) {
		return json({
			"msg": "Problem deleting",
		}, { "status": 500 });
	}

	return json({
		"msg": "Deleted",
	}, { "status": 200 });
}
