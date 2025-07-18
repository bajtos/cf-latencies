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

    await new Promise((resolve) => setTimeout(resolve, 1_000));

    return new Response(JSON.stringify({ result, duration }, null, 2), {
      headers: {
        "Cache-Control": "public, max-age=600, s-maxage=600",
      },
    });
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

    case "/fetched/kv":
      return fetchWithDefaultCaching("/kv", request, env, ctx);
    case "/fetched/d1":
      return fetchWithDefaultCaching("/d1", request, env, ctx);
    case "/fetched/filcdn":
      return fetchWithDefaultCaching(
        "https://0x23178ccd27cda5d5d18b211ad6648e189c1e16e1.calibration.filcdn.io/baga6ea4seaqnx22oectnclv2hk4lbeyvfsf5svnk6n3rcbhh674cqmxaykla2da",
        request,
        env,
        ctx,
      );
    case "/fetched/pdp":
      return fetchWithDefaultCaching(
        "https://polynomial.computer/piece/baga6ea4seaqnx22oectnclv2hk4lbeyvfsf5svnk6n3rcbhh674cqmxaykla2da",
        request,
        env,
        ctx,
      );

    case "/cached/kv":
      return fetchWithExplicitCaching("/kv", request, env, ctx);
    case "/cached/d1":
      return fetchWithExplicitCaching("/d1", request, env, ctx);
    case "/cached/filcdn":
      return fetchWithExplicitCaching(
        "https://0x23178ccd27cda5d5d18b211ad6648e189c1e16e1.calibration.filcdn.io/baga6ea4seaqnx22oectnclv2hk4lbeyvfsf5svnk6n3rcbhh674cqmxaykla2da",
        request,
        env,
        ctx,
      );
    case "/cached/pdp":
      return fetchWithDefaultCaching(
        "https://polynomial.computer/piece/baga6ea4seaqnx22oectnclv2hk4lbeyvfsf5svnk6n3rcbhh674cqmxaykla2da",
        request,
        env,
        ctx,
      );
  }
  return new Response("Not Found", { status: 404 });
}

async function fetchWithDefaultCaching(
  path: string,
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<unknown | Response> {
  const url = new URL(path, request.url);
  console.log(`Fetching ${url} with default caching`);

  const res = await fetch(url, {
    cf: {
      cacheTtl: 60, // Cache for 60 seconds
      cacheEverything: true, // Cache everything, including HTML responses
    },
  });

  const cacheStatus = res.headers.get("CF-Cache-Status");
  if (!res.ok) {
    const reason = await res.text();
    return { cacheStatus, error: res.status, reason };
  }
  const body = await res.json();
  return { cacheStatus, headers: Object.fromEntries(res.headers.entries()), body };
}

async function fetchWithExplicitCaching(
  path: string,
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<unknown | Response> {
  const url = new URL(path, request.url);
  console.log(`Fetching ${url} with caching`);

  const cacheKey = new Request(url.toString(), request);

  let cachedResponse = await caches.default.match(cacheKey);
  if (cachedResponse) {
    console.log(`Cache hit for ${url}`);
    const cacheStatus = cachedResponse.headers.get("CF-Cache-Status");
    const body = await cachedResponse.json();
    return { cacheStatus, headers: Object.fromEntries(cachedResponse.headers.entries()), body };
  } else {
    const res = await fetch(url, {
      cf: {
        cacheTtl: 60, // Cache for 60 seconds
        cacheEverything: true, // Cache everything, including HTML responses
      },
    });
    const [body1, body2] = res.body?.tee() ?? [null, null];
    caches.default.put(url.toString(), new Response(body1, res));
    cachedResponse = new Response(body2, res);
  }

  const cacheStatus = cachedResponse.headers.get("CF-Cache-Status");
  if (!cachedResponse.ok) {
    const reason = await cachedResponse.text();
    return { cacheStatus, error: cachedResponse.status, reason };
  }
  const body = await cachedResponse.json();
  return { cacheStatus, headers: Object.fromEntries(cachedResponse.headers.entries()), body };
}
