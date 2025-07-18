# cf-latencies

Exploration of Cloudflare D1/KV/Cache latencies

## Observations

- Cold reads from KV and D1 can be slow, up to 200-300ms.
- D1 is much slower than KV:
  - D1: ~300-500ms for every read.
  - KV: ~160ms for the first read, less than 10ms for subsequent reads.
- The default `fetch()` caching does not seem to work at all, despite the fact that we are fetching fetching from the CDN-accelerated hostname.
- Explicit caching works great, it gives us worker latency below 10ms on cache hits.

## URLs you can try yourself

Direct reads from KV or D1. The handler reports read latency and adds an artificial 1s delay to the response.

- https://bajtos-cf-latencies.filcdn.io/kv
- https://bajtos-cf-latencies.filcdn.io/d1

Read via `fetch()`, caching is configured using the `cf` request options.
See https://developers.cloudflare.com/workers/reference/how-the-cache-works/#fetch

- https://bajtos-cf-latencies.filcdn.io/fetched/d1
- https://bajtos-cf-latencies.filcdn.io/fetched/kv
- https://bajtos-cf-latencies.filcdn.io/fetched/filcdn
  - Origin: https://0x23178ccd27cda5d5d18b211ad6648e189c1e16e1.calibration.filcdn.io/baga6ea4seaqnx22oectnclv2hk4lbeyvfsf5svnk6n3rcbhh674cqmxaykla2da",
- https://bajtos-cf-latencies.filcdn.io/fetched/pdp
  - Origin: https://polynomial.computer/piece/baga6ea4seaqnx22oectnclv2hk4lbeyvfsf5svnk6n3rcbhh674cqmxaykla2da"

Custom getter wrapping `fetch()` with `caches.default`.
See https://developers.cloudflare.com/workers/reference/how-the-cache-works/#cache-api

- https://bajtos-cf-latencies.filcdn.io/cached/d1
- https://bajtos-cf-latencies.filcdn.io/cached/kv
- https://bajtos-cf-latencies.filcdn.io/cached/filcdn
  - Origin: https://0x23178ccd27cda5d5d18b211ad6648e189c1e16e1.calibration.filcdn.io/baga6ea4seaqnx22oectnclv2hk4lbeyvfsf5svnk6n3rcbhh674cqmxaykla2da",
- https://bajtos-cf-latencies.filcdn.io/cached/pdp
  - Origin: https://polynomial.computer/piece/baga6ea4seaqnx22oectnclv2hk4lbeyvfsf5svnk6n3rcbhh674cqmxaykla2da"
