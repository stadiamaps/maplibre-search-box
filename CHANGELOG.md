# Change Log

## v3.0.1

This fixes a few bugs we found after releasing v3.0.0.
However, almost everything is related to documentation and package metadata,
not actual code:

- Fixed the package.json metadata path to the stylesheet.
- Updated examples to use the new CSS path.
- Removed documentation indicating that the `searchOnEnter` was only available on some plans (we've changed this!).
- Search on enter is now enabled by default.

## v3.0.0

- Upgrades to the new v2 autocomplete + place details endpoint, bringing you faster responses and better results.
  And did we mention it's also cheaper?!
- BREAKING: We've reworked the response format to include more details.
  Geometry is unchanged, but some of the properties are different.
  Refer to our [migration guide](https://docs.stadiamaps.com/geocoding-search-autocomplete/v2-api-migration-guide/)
  for an overview of the structural changes.

## v2.0.0

- BREAKING: Upgrades to the latest version of the Stadia Maps TypeScript API. This exposes some new fields, unlocking even more use cases. It also means some of the type names changed, so this is a major release.

Migration: you can migrate any broken imports or type names by renaming `Pelias` to `Geocoding`.

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
