// Credly badges proxy for Cloudflare Workers.
// GET /?username=<credly-username>  ->  JSON array of public badges (metadata only).
//
// Unofficial: not affiliated with or endorsed by Credly. Only public profiles,
// metadata only, no image bytes are fetched, stored or served.

const UPSTREAM = "https://www.credly.com/users";
const USERNAME_RE = /^[a-z0-9][a-z0-9-]{0,59}$/i;
const USER_AGENT = "react-credly-badges (unofficial; metadata only)";

const FRESH_TTL = 6 * 60 * 60; // 6 hours: serve from cache without calling Credly
const STALE_TTL = 7 * 24 * 60 * 60; // 7 days: fallback copy if Credly fails
const TIMEOUT_MS = 8000;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

// CORS headers are added to EVERY response, including errors. Otherwise the
// browser reports a confusing CORS failure instead of the real error.
function json(body, status = 200, cacheControl = "no-store", extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
      "x-content-type-options": "nosniff",
      ...CORS,
      ...extra,
    },
  });
}

const error = (status, code) => json({ error: code }, status);

// ---------------------------------------------------------------------------
// Normalizer. This is the ONLY place that knows Credly's response shape.
// When Credly changes its format, this is the one function to fix.
// It is written defensively: missing fields never throw, bad items are skipped.
// ---------------------------------------------------------------------------

function safeHttps(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function safeDate(value) {
  if (typeof value !== "string" || !value) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

function toBadge(item) {
  const template = item?.badge_template ?? {};
  const id = item?.id ?? template.id;
  const name = template.name ?? item?.name;
  const imageUrl = safeHttps(
    item?.image_url ?? template.image_url ?? item?.image?.url,
  );

  if (typeof id !== "string" || !/^[\w-]{1,64}$/.test(id)) return null;
  if (typeof name !== "string" || !name || !imageUrl) return null;

  const issuerName =
    template.issuer?.entities?.[0]?.entity?.name ??
    template.issuer?.name ??
    null;

  return {
    id,
    name,
    issuerName: typeof issuerName === "string" ? issuerName : null,
    imageUrl,
    badgeUrl: `https://www.credly.com/badges/${id}/public_url`,
    issuedAt: safeDate(item?.issued_at_date ?? item?.issued_at),
    expiresAt: safeDate(item?.expires_at_date ?? item?.expires_at),
  };
}

export function normalize(raw) {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : null;
  if (!list) throw new Error("UNEXPECTED_FORMAT");
  return list.map(toBadge).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Cache helpers (Cloudflare Cache API). Silently disabled where `caches` is
// unavailable (e.g. plain Node tests).
// ---------------------------------------------------------------------------

const getCache = () => globalThis.caches?.default ?? null;
const freshKey = (u) =>
  new Request(`https://cache.credly-proxy.internal/v1/fresh/${u}`);
const staleKey = (u) =>
  new Request(`https://cache.credly-proxy.internal/v1/stale/${u}`);

async function cacheGet(key) {
  try {
    return (await getCache()?.match(key)) ?? null;
  } catch {
    return null;
  }
}

function cachePut(ctx, key, response) {
  const cache = getCache();
  if (!cache) return;
  const task = cache.put(key, response).catch(() => {});
  ctx?.waitUntil?.(task);
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

export async function handleRequest(request, env, ctx) {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "GET") return error(405, "METHOD_NOT_ALLOWED");

  const raw = new URL(request.url).searchParams.get("username") ?? "";
  const username = raw.trim().toLowerCase();

  // Strict allowlist pattern: never accept URLs or paths (prevents SSRF / open proxy).
  if (!USERNAME_RE.test(username)) return error(400, "INVALID_USERNAME");

  // Optional: restrict to specific profiles with a Worker variable
  // ALLOWED_USERNAMES="ahamed-safnaj,another-user"
  const allowed = env?.ALLOWED_USERNAMES;
  if (allowed) {
    const list = allowed.split(",").map((s) => s.trim().toLowerCase());
    if (!list.includes(username)) return error(403, "USERNAME_NOT_ALLOWED");
  }

  // 1) Fresh cache hit: Credly is not contacted at all.
  const fresh = await cacheGet(freshKey(username));
  if (fresh) return withHeader(fresh, "x-cache", "HIT");

  // 2) Ask Credly.
  let upstream;
  try {
    upstream = await fetch(
      `${UPSTREAM}/${encodeURIComponent(username)}/badges.json`,
      {
        headers: { "user-agent": USER_AGENT, accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
  } catch {
    return serveStaleOr(username, 502, "UPSTREAM_UNREACHABLE");
  }

  if (upstream.status === 404) return error(404, "PROFILE_NOT_FOUND");
  // No retries on 403/429: back off and serve stale data instead.
  if (!upstream.ok)
    return serveStaleOr(username, 502, `UPSTREAM_${upstream.status}`);

  let badges;
  try {
    badges = normalize(await upstream.json());
  } catch {
    return serveStaleOr(username, 502, "UPSTREAM_FORMAT_CHANGED");
  }

  const body = {
    username,
    fetchedAt: new Date().toISOString(),
    source: "credly",
    badges,
  };

  cachePut(
    ctx,
    freshKey(username),
    json(body, 200, `public, max-age=${FRESH_TTL}, s-maxage=${FRESH_TTL}`),
  );
  cachePut(
    ctx,
    staleKey(username),
    json(body, 200, `public, max-age=${STALE_TTL}`),
  );

  return json(
    body,
    200,
    `public, max-age=300, s-maxage=${FRESH_TTL}, stale-while-revalidate=86400, stale-if-error=${STALE_TTL}`,
    { "x-cache": "MISS" },
  );
}

async function serveStaleOr(username, status, code) {
  const stale = await cacheGet(staleKey(username));
  if (stale) return withHeader(stale, "x-cache", "STALE");
  return error(status, code);
}

function withHeader(response, name, value) {
  const copy = new Response(response.body, response);
  copy.headers.set(name, value);
  return copy;
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env, ctx);
    } catch {
      return error(500, "INTERNAL_ERROR"); // never leak internals, never crash
    }
  },
};
