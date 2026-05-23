const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

const MAX_BYTES = 512 * 1024; // 512 KB
const ID_RE = /^[a-z0-9]{16}$/;

function cors(body, status, extra = {}) {
	return new Response(body, { status, headers: { ...CORS, ...extra } });
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const parts = url.pathname.split('/').filter(Boolean);

		// Expect /sync/<id>
		if (parts.length !== 2 || parts[0] !== 'sync') {
			return cors('Not found', 404);
		}

		const id = parts[1];
		if (!ID_RE.test(id)) {
			return cors('Invalid sync ID', 400);
		}

		// CORS preflight
		if (request.method === 'OPTIONS') {
			return cors(null, 204);
		}

		if (request.method === 'GET') {
			const obj = await env.BUCKET.get(id);
			if (!obj) return cors('Not found', 404);
			const buf = await obj.arrayBuffer();
			return cors(buf, 200, { 'Content-Type': 'application/octet-stream' });
		}

		if (request.method === 'PUT') {
			const ct = request.headers.get('Content-Length');
			if (ct && parseInt(ct) > MAX_BYTES) {
				return cors('Payload too large', 413);
			}
			const buf = await request.arrayBuffer();
			if (buf.byteLength > MAX_BYTES) {
				return cors('Payload too large', 413);
			}
			await env.BUCKET.put(id, buf);
			return cors('OK', 200);
		}

		return cors('Method not allowed', 405);
	},
};
