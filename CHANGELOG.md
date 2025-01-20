# Change Log

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
