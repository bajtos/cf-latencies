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

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const start = Date.now();
    const result = await handle(request, env, ctx);
    const duration = Date.now() - start;

    if (result instanceof Response) return result;

    if (result === null) {
      await env.KV.put("main", "Hello from KV!");
    }

    return new Response(JSON.stringify({ result, duration }, null, 2));
  },
} satisfies ExportedHandler<Env>;

async function handle(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response | unknown> {
  const { pathname } = new URL(request.url);
  console.log("Handling request:", request.method, request.url, pathname);
  switch (pathname) {
    case "/d1":
      return env.DB.prepare("SELECT * FROM main LIMIT 1").first();
    case "/kv":
      return env.KV.get("main");
    case "/cached/kv":
      return fetchCached("/kv", request, env, ctx);
    case "/cached/d1":
      return fetchCached("/d1", request, env, ctx);
  }
  return new Response("Not Found", { status: 404 });
}

async function fetchCached(
  path: string,
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<unknown | Response> {
  const url = new URL(path, request.url);
  console.log(`fetching ${url} with caching`);
  const res = await fetch(url, {
    cf: {
      cacheTtl: 60, // Cache for 60 seconds
      cacheEverything: true, // Cache everything, including HTML responses
    },
  });
  if (!res.ok) {
    const reason = await res.text();
    return { error: res.status, reason };
  }
  const body = await res.json();
  return { headers: Object.fromEntries(res.headers.entries()), body };
}
