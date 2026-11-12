# Microburbs API demo (Next.js)

A Next.js app (App Router, TypeScript) built on the [Microburbs API](https://www.microburbs.com.au/developers/api-docs).
It runs on the public sandbox key, `test`, so it covers the nine sample suburbs (one per state and territory)
and the eight sample properties: suburb reports, a listings portal, block maps, crime, market and property
profiles. Dark mode by default with a light toggle; every map sits on a real base map.

Every page has an **API calls** panel beside it (hide it and it stays hidden until you reopen it). It lists the
calls the page made: the URL, the status, how long it took and the JSON that came back, and the same request as
curl, JavaScript or Python.

Live: <https://www.microburbs.com.au/demos>

| Page | What it shows |
|------|---------------|
| `/` | Search any suburb in Australia (`geocode/suburb`); sample suburbs open their report, any other suburb opens `/not-in-demo` |
| `/suburbs`, `/suburbs/{name}` | A one-page report per suburb: market, prices and rents over time, demographics, crime, schools, lifestyle, risks, development |
| `/listings`, `/listings/{gnaf_id}` | For sale, for rent and sold, with filters, a map view and a page per listing (`listings/for-sale`, `listings/for-rent`, `sales/recent`, property endpoints for the sample properties) |
| `/map` | Every block of one suburb on any layer |
| `/crime` | A suburb against the national crime rate, the offences behind it, and the rate block by block |
| `/property` | A sample property: valuation and range, value over time, its street, history, nearby sales, hazards, transport, schools |
| `/market` | Price, rent, yield and vacancy history for houses and units, growth, the forecast range and the latest sales |
| `/compare` | The nine sample suburbs in one sortable table |
| `/suburb-report/{name}` | The microburbs.com.au suburb report rebuilt from the API alone, with the same sections in the same order. Dashed "Not in the API" boxes mark what the website shows that the API does not serve |

Suburb endpoints are `/v1/suburbs/{name}/...` and property endpoints are `/v1/properties/{gnaf_id}/...`. The
full reference is at <https://www.microburbs.com.au/developers/api-docs>.

## The sandbox, and widening it

[`src/lib/sandbox.ts`](src/lib/sandbox.ts) lists the sample suburbs and properties, matching the API's own
sandbox lists. The UI only offers those, and the server refuses any other `/v1/` path with a `403` before it
reaches the API (fail closed). With your own key from <https://www.microburbs.com.au/developers/keys>, widen
`SANDBOX_SUBURBS`, `SAMPLE_PROPERTIES` and `sandboxAllows()` to what you want the app to serve.

## Two ways a page gets data

- **On the server** (suburb reports, listings): the page is a server component that calls
  `api(path)` from [`src/lib/server/microburbs.ts`](src/lib/server/microburbs.ts), fetching in parallel with
  `Promise.all`, and renders complete HTML. `export const revalidate = 3600` caches the rendered page for an
  hour. It hands the call records to `<ServerCalls calls={...} />` so the API panel can list them.
- **In the browser** (maps you switch between, search as you type): a client component calls `useApi(path)`,
  which fetches this app's own `/api/mb/v1/...` route. That route adds the key on the server.

## Run it

You need Node.js 20.9 or newer. The sandbox key works out of the box.

```bash
npm install
cp .env.example .env.local      # MICROBURBS_API_KEY=test, or your own key
npm run dev                     # http://localhost:3000/demos (served under basePath /demos)
```

`npm run build && npm start` runs the production build. The project uses npm and ships a `package-lock.json`.
Dependency versions are pinned exactly.

## How the key stays secret

The browser never calls the API directly, and it never sees the key.

1. A page asks this app for `/api/mb/v1/suburbs/Bondi/crime/summary`.
2. The route handler in [`src/app/api/mb/[...path]/route.ts`](src/app/api/mb/[...path]/route.ts) reads
   `MICROBURBS_API_KEY` from the environment and calls
   `https://api.microburbs.com.au/v1/suburbs/Bondi/crime/summary` with
   `Authorization: Bearer <key>`.
3. It returns the API's response body unchanged. It adds a few headers for the inspector, such as the
   upstream URL without the key and the upstream time.

The fetch code is in [`src/lib/server/microburbs.ts`](src/lib/server/microburbs.ts). It imports
`server-only`, so the build fails if a client component ever imports it. Never give the key a
`NEXT_PUBLIC_` prefix, because that would put it in the JavaScript bundle. The inspector's snippets show
the public sandbox key, `test`, never the key the server holds.

The route only forwards `GET` requests under `/v1/`, and only inside the sandbox (`src/lib/sandbox.ts`). If
you deploy the app with your own key, anyone could use that route with it, so put your own login in front of
it first.

## Being polite to the API

Each key gets about 10 requests a second. The server-side client:

- sends at most 8 requests a second, and waits and retries when the API answers `429`;
- caches successful answers in memory and in Next's data cache for an hour;
- marks `/api/mb` answers cacheable (`s-maxage=3600`), so on Vercel the CDN answers repeats without a call;
- shares one upstream call when two requests for the same path arrive together.

The browser also sends no more than 6 requests to the app at once.

## Things worth knowing about the API

- **Suburb names are the official suburb names (SAL).** Some have suffixes, such as `St Kilda (Vic.)` (Queensland and South
  Australia have one too). Take them from `GET /v1/geocode/suburb?q=` rather than typing them. Encode them
  in the path: `/v1/suburbs/St%20Kilda%20(Vic.)/...`.
- **No data is not an error.** You get HTTP 200 with `{"data": null, "available": false, "message": ...}`.
  Every panel here handles `data === null` and shows the message.
- **On the sandbox key, anything outside the sample suburbs and properties returns 403**, as does address
  search (`geocode/address`, a billed endpoint). Suburb search (`geocode/suburb`) is free and works for every
  suburb.
- **Block-level layers join on the mesh-block code.** `shapes/mesh-blocks` gives polygons with
  `properties.mb`; the `*-map` endpoints give values keyed by the same `mb`. House-price and rent maps cover
  houses only, so apartment-only blocks (most of the CBD) have no figure there.

## Project layout

```
src/
  app/
    api/mb/[...path]/route.ts   the only place the browser's requests leave the app
    page.tsx                    homepage with the universal search
    suburbs/ listings/ map/ crime/ property/ market/ compare/ not-in-demo/
  components/
    Inspector.tsx               the API calls panel (collapsible, remembered)
    ChoroplethMap.tsx           GeoJSON over a MapLibre base map, coloured by value
    UniversalSearch.tsx         one box for every suburb (and the sample addresses)
    LineChart.tsx               SVG time series
    PageShell.tsx               page frame, panels, loading and empty states
  lib/
    server/microburbs.ts        server-only API client: api(path), key, pacing, retries, cache
    api-store.tsx               useApi(path): fetches through /api/mb and logs each call for the inspector
    api.ts                      paths, response types, curl/JS/Python snippets
    sandbox.ts                  the sample suburbs and properties, and the server-side allowlist
    layers.ts                   the block-level map layers
    pages.ts                    the demo list (nav and homepage), plus the "More demos" links
    theme.ts                    dark/light theme and the API panel state
```

To add a page, add an entry to `src/lib/pages.ts` and create `src/app/<slug>/page.tsx`. In the page,
render `<PageShell slug="<slug>">` and fetch with `useApi("/v1/...")`. Wrap each block in
`<Panel calls={[result.call]}>` so its calls are linked to the inspector.

Maps use [MapLibre GL](https://maplibre.org) over free [OpenFreeMap](https://openfreemap.org) base maps
(OpenStreetMap data, no key, commercial use allowed with attribution). Charts are plain SVG. Styling is
Tailwind CSS v4 with CSS-variable tokens for the dark and light themes (`src/app/globals.css`). The functions
run in Vercel's Sydney region (`vercel.json`), next to the API.

Listing photos are free Pexels stock images in `public/photos`, chosen per listing and marked "Sample photo":
the API does not return listing photos.
