/**
 * Public origin for absolute redirects built in the middleware (QA P1c O-9, DECISIONS Q-30 / A-8).
 *
 * Behind a reverse proxy (Caddy in deploy/) the URL that Next.js gives the middleware is the
 * internal server address (e.g. `http://localhost:3000`), so `new URL(path, request.url)` pointed
 * staff at an address their browser cannot reach. The origin is taken, in order, from:
 *
 * 1. `AUTH_URL` (Auth.js public URL, the origin part only), then `SITE_URL` — set in production;
 * 2. with `TRUST_PROXY=true` only: `X-Forwarded-Host` + `X-Forwarded-Proto` set by the proxy;
 * 3. the `Host` header with the protocol of the request URL;
 * 4. the request URL itself (previous behaviour).
 *
 * Header values are accepted only when they look like a host name (no path, credentials or spaces),
 * so a crafted header cannot turn the redirect into an arbitrary URL. Edge-safe: no Node APIs.
 */
type Env = Readonly<Record<string, string | undefined>>;

type RequestLike = { url: string; headers: Pick<Headers, "get"> };

/** host or host:port; bracketed IPv6 allowed. */
const HOST =
  /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*|\[[0-9a-f:.]+\])(?::\d{1,5})?$/i;

/** `http(s)://host[:port]` of an absolute http(s) URL, or null. */
function originOf(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** First value of a comma-separated forwarding header, if it is a plain host. */
function hostHeader(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim();
  return first && HOST.test(first) ? first.toLowerCase() : null;
}

export function publicOrigin(request: RequestLike, env: Env = process.env): string {
  const configured = originOf(env.AUTH_URL) ?? originOf(env.SITE_URL);
  if (configured) return configured;

  const requestUrl = new URL(request.url);
  if (env.TRUST_PROXY === "true") {
    const host = hostHeader(request.headers.get("x-forwarded-host"));
    if (host) {
      const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
      const scheme =
        proto === "http" || proto === "https" ? proto : requestUrl.protocol.slice(0, -1);
      return `${scheme}://${host}`;
    }
  }
  const host = hostHeader(request.headers.get("host"));
  if (host) return `${requestUrl.protocol}//${host}`;
  return requestUrl.origin;
}

/** Absolute URL of a same-site path (`/admin/login`) on the public origin. */
export function publicUrl(path: string, request: RequestLike, env: Env = process.env): URL {
  return new URL(path, `${publicOrigin(request, env)}/`);
}
