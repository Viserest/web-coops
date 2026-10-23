const TITLES: Record<number, string> = {
	400: "Bad Request",
	401: "Unauthorized",
	403: "Forbidden",
	404: "Not Found",
	405: "Method Not Allowed",
	409: "Conflict",
	413: "Payload Too Large",
	429: "Too Many Requests",
	500: "Internal Server Error",
	502: "Bad Gateway",
	503: "Service Unavailable",
};

const ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

// Responses produced by errorPage, so `finally` doesn't render them twice
export const rendered = new WeakSet<Response>();

export function errorPage(status: number, request: Request): Response {
	const url = new URL(request.url);
	const shownUrl = esc(url.origin + url.pathname); // no query string or hash
	const title = TITLES[status] ?? "Error";

	const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${status} ${esc(title)}</title>
<style>
	body { font-family: system-ui, sans-serif; margin: 0; min-height: 100vh;
		display: grid; place-items: center; text-align: center; }
	h1 { font-size: 1.25rem; margin: 0 0 1rem; }
	.code { font-size: 4rem; font-weight: 700; margin: 0; }
	.url { color: #666; word-break: break-all; }
</style>
</head>
<body>
<main>
	<h1>Something went wrong</h1>
	<p class="code">${status}</p>
	<p>${esc(title)}</p>
	<p class="url">${shownUrl}</p>
</main>
</body>
</html>`;

	const res = new Response(html, {
		status,
		headers: {
			"content-type": "text/html; charset=utf-8",
			"cache-control": "no-store",
		},
	});
	rendered.add(res);
	return res;
}
