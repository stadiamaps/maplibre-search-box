# Change Log


## v2.0.0

- Upgrades to the new v2 autocomplete + place details endpoint, bringing you faster responses and better results.
  And did we mention it's also cheaper?!
- BREAKING: We've reworked the response format to include more details.
  Geometry is unchanged, but some of the properties are different.
  Refer to our [migration guide](https://docs.stadiamaps.com/geocoding-search-autocomplete/v2-api-migration-guide/)
  for an overview of the structural changes.

## v1.1.0

- Replaces the layer text with an icon
- Improves localizability
- Fixes a variety of label truncation issues and generally makes the layout more compact

## v1.0.0

- Fixes a bug with search-on-enter interfering with arrow key-based navigation (https://github.com/stadiamaps/maplibre-search-box/issues/1)

## v0.6.0

- Support changing the base URL (ex: for EU endpoints)

## v0.5.0

- Adds arrow key-based navigation!

## v0.4.0

- Adds optional callback to options so that developers can take additional action when the user selects a result.
