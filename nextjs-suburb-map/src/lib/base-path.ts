/**
 * The demo is served under www.microburbs.com.au/demos: the main site rewrites
 * /demos/* to this app, so every route here lives under BASE_PATH.
 *
 * Next adds the base path to <Link>, router.push, redirect() and its own
 * assets. It does NOT add it to raw strings: fetch("/api/..."), <img src>,
 * worker URLs. Wrap those in withBase().
 */
export const BASE_PATH = "/demos";

/** Where the demo lives publicly; canonical URLs and the sitemap point here. */
export const SITE_URL = `https://www.microburbs.com.au${BASE_PATH}`;

/** "/photos/x.webp" -> "/demos/photos/x.webp" for raw src / fetch strings. */
export const withBase = (path: string) => `${BASE_PATH}${path}`;
