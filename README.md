# Stadia Maps MapLibre Search Box

[![npm version](https://badge.fury.io/js/@stadiamaps%2Fmaplibre-search-box.svg)](https://badge.fury.io/js/@stadiamaps%2Fmaplibre-search-box)

This [MapLibre GL JS](https://maplibre.org/projects/maplibre-gl-js/) plugin adds support for the [Stadia Maps Search
Autocomplete APIs](https://docs.stadiamaps.com/geocoding-search-autocomplete/overview/) to any MapLibre GL JS map.

Based on the [Stadia Maps TS SDK](https://www.npmjs.com/package/@stadiamaps/api), it automatically handles best-practice
functionality for search, including debouncing of requests, caching of previous results,
and zooming the map when a result is selected.

## Getting Started

Adding the search box to a map is straightforward:

1. Add the TS/JS and CSS dependencies.
2. Instantiate the control (optionally customize the settings).
3. Add the control to the map.

### Getting a Stadia Maps account

You can try everything out locally in a web browser without any special setup!
To deploy to an internet server though, you'll need a Stadia Maps account.
Learn more about how we authenticate requests in our
[documentation](https://docs.stadiamaps.com/authentication/?utm_source=github&utm_campaign=sdk_readme&utm_content=maplibre_search_box_readme),
and sign up for a free account (no credit card required)
using our [client dashboard](https://client.stadiamaps.com/signup/?utm_source=github&utm_campaign=sdk_readme&utm_content=maplibre_search_box_readme).

### Using build tooling

First, add `@stadiamaps/maplibre-search-box` as a dependency of your project using your favorite package manager
like `npm` or `yarn`.

```shell
$ npm install --save @stadiamaps/maplibre-search-box
```

Import and use the package along with the map. (Be sure to add the control to the map!)

```typescript
import { MapLibreSearchControl } from "@stadiamaps/maplibre-search-box";
import "@stadiamaps/maplibre-search-box/dist/style.css";

const control = new MapLibreSearchControl();
const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.stadiamaps.com/styles/alidade_smooth.json", // stylesheet location
  center: [-74.5, 40], // starting position [lng, lat]
  zoom: 2, // starting zoom
});
map.addControl(control, "top-left");
```

### Using Unpkg

Add this to your `<head>`:

```html
<script
  src="https://unpkg.com/browse/@stadiamaps/maplibre-search-box/dist/maplibre-search-box.umd.js"
  type="application/javascript"
></script>
<link
  href="https://unpkg.com/browse/@stadiamaps/maplibre-search-box/dist/style.css"
  rel="stylesheet"
/>
```

Add this to your `<body>`:

```html
<div id="map" style="height: 100vh; width: 100vw"></div>
<script type="application/javascript">
  var control = new maplibreSearchBox.MapLibreSearchControl({
    useMapFocusPoint: true,
  });
  var map = new maplibregl.Map({
    container: "map",
    style: "https://tiles.stadiamaps.com/styles/alidade_smooth.json", // stylesheet location
    center: [-74.5, 40], // starting position [lng, lat]
    zoom: 2, // starting zoom
  });
  map.addControl(control, "top-left");
</script>
```

## Options

The `MapLibreSearchControl` constructor takes a set of options (as an object):

### Options Overview

```typescript
export class MapLibreSearchControlOptions {
  useMapFocusPoint = true;
  mapFocusPointMinZoom = 5;
  fixedFocusPoint: [number, number] = null;
  searchOnEnter = false;
  maxResults = 5;
  minInputLength = 3;
  minWaitPeriodMs = 100;
  layers: PeliasLayer[] = null;
  onResultSelected?: (feature: PeliasGeoJSONFeature) => void;
  baseUrl: string | null = null;
}
```

### Options Detail

### `useMapFocusPoint`

If set, the map center point is used to influence the search for better contextual results.

### `mapFocusPointMinZoom`

On low zooms, the focus point is often unuseful for contextual results (e.g., on zoom 0, the whole world is visible, so
the center is not valuable). This controls at what zoom the center is used to influence results.

### `fixedFocusPoint`

A single point used to influence results (doesn't follow the map viewport).

### `searchOnEnter`

For address-based forward geocoding applications, it often makes sense to use the forward geocoding (`/search`) endpoint
rather than autocomplete search, once you know that the user has completed their input. The full forward geocoding
endpoint is able to interpolate addresses, and may provide better results with complete input than the autocomplete
endpoint. Opting in to this behavior will send a final forward geocoding request if the user presses enter.

Note: the `/search` endpoint is not available to all plans, so check if your plan supports `/search` before enabling
this. You can find the full feature comparison on our [pricing page](https://stadiamaps.com/pricing/).

### `maxResults`

Maximum number of results to return.

### `minInputLength`

Minimum number of characters to wait for before making the first search.

### `minWaitPeriodMs`

The minimum time to wait between searches. Higher values decrease the number of API requests made, but increase the
received latency of the input.

### `layers`

Which layers to use in the search. Defaults to all layers. See
the [Layers documentation](https://docs.stadiamaps.com/geocoding-search-autocomplete/layers/) for more details.

Note: if you want the fastest possible search, but don't mind excluding addresses or Point of Interest (`venue`)
results, use `['coarse']` for the best performance.

### `onResultSelected`

A callback to be invoked whenever a result is selected by the user. This is invoked with a single argument, the
`PeliasFeature` for the result. This allows you take an action (such as autofilling your own form).

### `baseUrl`

An optional override to the base API URL. This defaults to the primary Stadia Maps API endpoint. If you want
to use our [EU endpoints](https://docs.stadiamaps.com/eu-gdpr-endpoints/) to ensure traffic is handled by EU servers,
set the `baseUrl` to `https://api-eu.stadiamaps.com`.

## Development

- `dev` - starts dev server
- `build` - generates the following bundles: CommonJS (`.cjs`) ESM (`.mjs`) and IIFE (`.iife.js`). The name of bundle is automatically taken from `package.json` name property
- `test` - starts vitest and runs all tests
- `test:coverage` - starts vitest and run all tests with code coverage report
- `lint:scripts` - lint `.ts` files with eslint
- `lint:styles` - lint `.css` and `.scss` files with stylelint
- `format:scripts` - format `.ts`, `.html` and `.json` files with prettier
- `format:styles` - format `.cs` and `.scss` files with stylelint
- `format` - format all with prettier and stylelint
- `prepare` - script for setting up husky pre-commit hook
- `uninstall-husky` - script for removing husky from repository
