import type { IControl, Map } from "maplibre-gl";
import {
  type AutocompleteV2Request,
  Configuration,
  FeaturePropertiesV2,
  GeocodingApi,
  GeocodingGeoJSONFeature,
  GeocodingGeoJSONProperties,
  LayerId,
  SearchRequest,
  WofContextComponent,
} from "@stadiamaps/api";
import "./index.scss";

// Stadia Maps logo
import logo from "./assets/logo.svg";

// Place type icons
import location_pin from "./assets/location_on.svg";
import address from "./assets/123.svg";
import road from "./assets/road.svg";
import post_box from "./assets/post_box.svg";
// NOTE: UK globe selected because Google's other icons had such bad fidelity
// that they were unrecognizable as an outline of a country/region
import globe from "./assets/globe.svg";
import globe_lines from "./assets/globe_lines.svg";
import location_city from "./assets/location_city.svg";
import water from "./assets/water.svg";

export class MapLibreSearchControlOptions {
  useMapFocusPoint = true;
  mapFocusPointMinZoom = 5;
  fixedFocusPoint: [number, number] = null;
  searchOnEnter = false;
  maxResults = 5;
  minInputLength = 3;
  minWaitPeriodMs = 100;
  layers: LayerId[] = null;
  onResultSelected?: (feature: FeaturePropertiesV2) => void;
  baseUrl: string | null = null;
}

export class MapLibreSearchControl implements IControl {
  private map: Map | null = null;
  private container: HTMLElement | null = null;
  private resultsContainer: HTMLElement | null = null;
  private resultsList: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private clearButton: HTMLElement | null = null;
  private loadingSpinner: HTMLElement | null = null;
  private api: GeocodingApi;
  private lastRequestAt = 0;
  private lastRequestString = "";
  private resultFeatures: FeaturePropertiesV2[] = [];
  private selectedResultIndex: number | null = null;
  private originalInput = "";

  options = new MapLibreSearchControlOptions();

  constructor(options: Partial<MapLibreSearchControlOptions> = {}) {
    this.options = Object.assign(new MapLibreSearchControlOptions(), options);
    this.api = new GeocodingApi(
      new Configuration({ basePath: options.baseUrl })
    );
  }

  onAdd(map: Map): HTMLElement {
    this.map = map;
    this.container = this.buildInput();
    return this.container;
  }

  buildInput(): HTMLElement {
    const container = document.createElement("div");
    container.className = "maplibregl-ctrl stadiamaps-search-box";
    const inputContainer = container.appendChild(document.createElement("div"));
    inputContainer.className = "input-container";

    this.clearButton = inputContainer.appendChild(
      document.createElement("span")
    );
    this.clearButton.className = "cancel hidden";
    this.clearButton.addEventListener("click", this.onClear.bind(this));

    this.loadingSpinner = inputContainer.appendChild(
      document.createElement("span")
    );
    this.loadingSpinner.className = "spinner lds-dual-ring hidden";

    this.input = inputContainer.appendChild(document.createElement("input"));
    this.input.type = "text";
    this.input.placeholder = "Search for places...";
    this.input.addEventListener("input", this.onInput.bind(this));
    this.input.addEventListener("focus", this.onFocus.bind(this));
    this.input.addEventListener("keydown", this.onKey.bind(this));
    this.input.enterKeyHint = "search";

    this.resultsContainer = container.appendChild(
      document.createElement("div")
    );
    this.resultsContainer.className = "results hidden";
    this.resultsList = this.resultsContainer.appendChild(
      document.createElement("div")
    );
    this.resultsList.className = "results-list";

    const attribution = this.resultsContainer.appendChild(
      document.createElement("div")
    );
    attribution.className = "search-attribution";
    attribution.innerHTML = `<img height="50" width="50" src="${logo}" alt="Stadia Maps" class="logo"> Powered by <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a><br>&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="nofollow">OpenStreetMap</a> contributors &amp; <a href="https://stadiamaps.com/attribution/" target="_blank">others</a>`;

    return container;
  }

  getContainer() {
    return this.container;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async onFocus(_e: Event) {
    if (this.resultFeatures.length > 0) {
      this.showResults();
    }

    this.maybeShowClearButton();
  }

  maybeShowClearButton() {
    const show = this.input.value.length > 0;

    this.clearButton.classList.toggle("hidden", !show);
  }

  async onKey(e: KeyboardEvent) {
    switch (e.key) {
      case "Enter":
        if (this.selectedResultIndex !== null) {
          this.onSelected(this.resultFeatures[this.selectedResultIndex]);
          this.input.blur();
        } else if (this.options.searchOnEnter) {
          await this.onInput(e, true);
        }
        break;
      case "Escape":
        this.onClear();
        break;
      case "ArrowDown":
      case "ArrowUp":
        e.preventDefault(); // prevent the input field from consuming the event
        this.handleArrowKey(e.key);
        break;
    }
  }

  handleArrowKey(key: string) {
    if (key === "ArrowDown") {
      if (this.selectedResultIndex === null) {
        this.selectedResultIndex = 0;
        this.originalInput = this.input.value;
      } else if (this.selectedResultIndex < this.resultFeatures.length - 1) {
        this.selectedResultIndex++;
      }
    } else if (key === "ArrowUp") {
      if (this.selectedResultIndex > 0) {
        this.selectedResultIndex--;
      } else if (this.selectedResultIndex === 0) {
        this.selectedResultIndex = null;
        this.input.value = this.originalInput;
      }
    }

    this.updateSelectedResult();
  }

  updateSelectedResult() {
    const results = Array.from(this.resultsList.children);
    results.forEach((result, index) => {
      if (index === this.selectedResultIndex) {
        result.classList.add("hover");
        this.input.value = this.resultFeatures[index].properties.name;
      } else {
        result.classList.remove("hover");
      }
    });
  }

  async onInput(e: Event, useSearch = false) {
    this.maybeShowClearButton();

    const searchString = this.input.value;

    if (!searchString) {
      this.clearResults();
      this.hideResults();
      return;
    }

    const timeSinceLastRequest = Date.now().valueOf() - this.lastRequestAt;
    if (
      this.lastRequestAt === 0 ||
      timeSinceLastRequest >= this.options.minWaitPeriodMs
    ) {
      if (searchString.length >= this.options.minInputLength) {
        if (searchString !== this.lastRequestString || useSearch) {
          const params: AutocompleteV2Request = {
            text: searchString,
            size: this.options.maxResults,
          };

          if (this.options.layers) {
            params.layers = this.options.layers;
          }

          let focusPoint = this.options.fixedFocusPoint;
          if (this.options.useMapFocusPoint) {
            if (this.map.getZoom() >= this.options.mapFocusPointMinZoom) {
              focusPoint = this.map.getCenter().toArray();
            }
          }

          if (focusPoint) {
            params.focusPointLon = focusPoint[0];
            params.focusPointLat = focusPoint[1];
          }

          if (this.options.layers) {
            params.layers = this.options.layers;
          }

          this.lastRequestString = searchString;
          const requestAt = Date.now().valueOf();
          this.lastRequestAt = requestAt;
          this.container.classList.toggle("loading", true);
          try {
            let features;
            if (useSearch) {
              // FIXME: Some hacks until we launch search v2
              let searchParams: SearchRequest = {
                text: params.text,
              };
              Object.assign(searchParams, params);
              searchParams.layers = params.layers?.map(layerId => {
                switch (layerId) {
                  case "poi":
                    return "venue";
                  default:
                    return layerId;
                }
              });
              let response = await this.api.search(searchParams);
              features = response.features.map(upcastLegacyFeature);
            } else {
              let response = await this.api.autocompleteV2(params);
              features = response.features;
            }

            // Make sure we only use the latest request
            if (this.lastRequestAt === requestAt) {
              this.clearResults();
              this.resultFeatures = features;
              if (this.resultFeatures.length > 0) {
                for (const result of this.resultFeatures) {
                  this.addResult(result);
                }
              } else {
                this.onNoResults();
              }
            }
          } catch (e) {
            console.warn(`Something when wrong with the request: ${e}`);
          } finally {
            if (this.lastRequestAt === requestAt) {
              this.container.classList.toggle("loading", false);
            }
          }
        }
      }
    } else {
      setTimeout(() => {
        this.onInput(e, useSearch);
      }, this.options.minWaitPeriodMs);
    }
  }

  onNoResults() {
    this.showResults();

    const el = document.createElement("div");
    el.className = "result no-result";
    el.textContent = "No Results Found";

    this.resultsList.appendChild(el);
  }

  async onSelected(feature: FeaturePropertiesV2) {
    if (!hasGeometry(feature)) {
      // We need to get the full details if there isn't a geometry
      const detail = await this.api.placeDetailsV2({
        ids: [feature.properties.gid],
      });
      if (detail.features.length == 0) {
        console.error("Unexpected place lookup response with zero results");
      }
      await this.onSelected(detail.features[0]);
    } else if (feature.bbox !== undefined) {
      this.map.fitBounds([
        [feature.bbox[0], feature.bbox[1]],
        [feature.bbox[2], feature.bbox[3]],
      ]);
    } else {
      let zoomTarget;
      switch (feature.properties.layer) {
        case "venue":
        case "poi":
        case "address":
          zoomTarget = 16;
          break;
        case "marinearea":
        case "locality":
          zoomTarget = 12;
          break;
        case "empire":
        case "macrocounty":
        case "country":
          zoomTarget = 4;
          break;
        case "dependency":
        case "county":
          zoomTarget = 10;
          break;
        case "continent":
        case "ocean":
          zoomTarget = 2;
          break;
        case "macroregion":
        case "region":
          zoomTarget = 7;
          break;
        case "borough":
        case "localadmin":
          zoomTarget = 12;
          break;
        case "macrohood":
        case "postalcode":
        case "neighbourhood":
        case "street":
          zoomTarget = 14;
          break;
        default:
          zoomTarget = 10;
      }
      this.map.flyTo({
        center: [
          feature.geometry.coordinates[0],
          feature.geometry.coordinates[1],
        ],
        zoom: zoomTarget,
      });
    }

    this.hideResults();

    // User-defined callback
    if (this.options.onResultSelected) {
      this.options.onResultSelected(feature);
    }
  }

  onClear() {
    this.input.value = "";
    this.maybeShowClearButton();
    this.clearResults();
    this.hideResults();
    this.input.focus();
  }

  icon(layer: string): string {
    switch (layer) {
      case "venue":
      case "poi":
        return location_pin;
      case "address":
        return address;
      case "street":
        return road;
      case "postalcode":
        return post_box;
      case "localadmin":
      case "locality":
      case "borough":
      case "neighbourhood":
      case "macrohood":
      case "coarse": // Never actually encountered
        return location_city;
      case "county":
      case "macroregion":
      case "macrocounty":
      // The regions above this line which are bigger than a "city"
      // but smaller than a "state" or similar unit
      // could do with a better icon, but finding one has proven elusive
      case "region":
      case "country":
      case "dependency":
      case "disputed":
        return globe;
      case "empire":
      case "continent":
        return globe_lines;
      case "marinearea":
      case "ocean":
        return water;
      default:
        return location_pin;
    }
  }

  buildResult(result: FeaturePropertiesV2): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "result";
    el.onclick = async () => {
      this.selectedResultIndex = this.resultFeatures.indexOf(result);
      this.updateSelectedResult();
      this.onSelected(result);
    };

    el.title = result.properties.name;

    const icon = el.appendChild(document.createElement("img"));
    icon.src = this.icon(result.properties.layer);
    icon.className = "result-icon";

    const label = el.appendChild(document.createElement("div"));
    label.textContent = result.properties.name;
    label.className = "result-label";

    const additionalText = el.appendChild(document.createElement("div"));
    additionalText.className = "result-extra";
    additionalText.textContent =
      result.properties.coarseLocation || subtitle(result.properties);

    return el;
  }

  addResult(result: FeaturePropertiesV2) {
    this.showResults();
    this.resultsList.appendChild(this.buildResult(result));
  }

  hideResults() {
    this.resultsContainer.classList.toggle("hidden", true);
  }

  showResults() {
    this.resultsContainer.classList.toggle("hidden", false);
  }

  clearResults() {
    this.resultFeatures = [];
    this.resultsList.replaceChildren("");
    this.selectedResultIndex = null;
    this.originalInput = "";
  }

  onRemove(map: Map): void {
    if (map._container) {
      this.container?.parentNode?.removeChild(this.container);
    }
    this.container = null;
    this.map = null;
  }
}

function hasGeometry(result: FeaturePropertiesV2): boolean {
  return result.geometry !== null && result.geometry !== undefined;
}

// Legacy shims which we can remove as soon as the V2 search API is live.

function subtitle(properties: GeocodingGeoJSONProperties): string {
  let components: string[] = [];
  switch (properties.layer) {
    case "venue":
    case "address":
    case "street":
    case "neighbourhood":
    case "postalcode":
    case "macrohood":
      components = [
        properties.locality ?? properties.region,
        properties.country,
      ];
      break;
    case "country":
    case "dependency":
    case "disputed":
      components = [properties.continent];
      break;
    case "macroregion":
    case "region":
      components = [properties.country];
      break;
    case "macrocounty":
    case "county":
    case "locality":
    case "localadmin":
    case "borough":
      components = [properties.region, properties.country];
      break;
    case "coarse":
    case "marinearea":
    case "empire":
    case "continent":
    case "ocean":
      break;
  }

  return components.filter(x => x !== null && x !== undefined).join(", ");
}

function upcastLegacyFeature(
  feature: GeocodingGeoJSONFeature
): FeaturePropertiesV2 {
  return {
    type: "Feature",
    bbox: feature.bbox,
    properties: {
      addendum: feature.properties.addendum,
      addressComponents: {
        number: feature.properties.housenumber,
        street: feature.properties.street,
        postalCode: feature.properties.postalcode,
      },
      coarseLocation: subtitle(feature.properties),
      confidence: feature.properties.confidence,
      context: {
        whosonfirst: {
          borough: extractWofContextcomponent(feature.properties, "borough"),
          continent: extractWofContextcomponent(
            feature.properties,
            "continent"
          ),
          country: extractWofContextcomponent(feature.properties, "country"),
          county: extractWofContextcomponent(feature.properties, "county"),
          localadmin: extractWofContextcomponent(
            feature.properties,
            "localadmin"
          ),
          locality: extractWofContextcomponent(feature.properties, "locality"),
          neighbourhood: extractWofContextcomponent(
            feature.properties,
            "neighbourhood"
          ),
          region: extractWofContextcomponent(feature.properties, "region"),
        },
        iso3166A2: feature.properties.countryCode,
        iso3166A3: feature.properties.countryA,
      },
      gid: feature.properties.gid,
      layer:
        feature.properties.layer === "venue" ? "poi" : feature.properties.layer,
      name: feature.properties.name,
      precision: feature.properties.accuracy,
      sources: [
        {
          source: feature.properties.source,
          sourceId: feature.properties.sourceId,
        },
      ],
    },
  };
}

function extractWofContextcomponent(
  properties: GeocodingGeoJSONProperties,
  key: string
): WofContextComponent | undefined {
  if (properties[key] && properties[`${key}GID`]) {
    return {
      name: properties[key],
      gid: properties[`${key}GID`],
      abbreviation: properties[`${key}A`],
    };
  } else {
    return undefined;
  }
}
