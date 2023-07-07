import type { IControl, Map } from "maplibre-gl";
import {
  type AutocompleteRequest,
  Configuration,
  GeocodingApi,
  PeliasGeoJSONFeature,
  PeliasLayer,
} from "@stadiamaps/api";
import "./index.scss";
import logo from "./logo.svg";

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
  private resultFeatures: PeliasGeoJSONFeature[] = [];
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
        if (this.options.searchOnEnter) {
          await this.onInput(e, true);
        } else if (this.selectedResultIndex !== null) {
          this.onSelected(this.resultFeatures[this.selectedResultIndex]);
          this.input.blur();
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
        this.input.value = this.resultFeatures[index].properties.label;
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
          const params: AutocompleteRequest = {
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
            let results;
            if (useSearch) {
              results = await this.api.search(params);
            } else {
              results = await this.api.autocomplete(params);
            }

            // Make sure we only use the latest request
            if (this.lastRequestAt === requestAt) {
              this.clearResults();
              this.resultFeatures = results.features;
              if (this.resultFeatures.length > 0) {
                for (const result of this.resultFeatures) {
                  this.addResult(result);
                }
              } else {
                this.onNoResults();
              }
            }
          } catch (e) {
            console.warn("Something when wrong with the request.");
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

  onSelected(feature: PeliasGeoJSONFeature) {
    if (feature.bbox !== undefined) {
      this.map.fitBounds([
        [feature.bbox[0], feature.bbox[1]],
        [feature.bbox[2], feature.bbox[3]],
      ]);
    } else {
      let zoomTarget;
      switch (feature.properties.layer) {
        case "venue":
        case "address":
          zoomTarget = 15;
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

  buildResult(result: PeliasGeoJSONFeature): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "result";
    el.onclick = () => {
      this.selectedResultIndex = this.resultFeatures.indexOf(result);
      this.updateSelectedResult();
      this.onSelected(result);
    };

    el.title = result.properties.label;

    const label = el.appendChild(document.createElement("div"));
    label.textContent = result.properties.label;
    label.className = "result-label";

    const additionalText = el.appendChild(document.createElement("div"));
    additionalText.className = "result-extra";
    let content = result.properties.layer;
    if (
      result.properties.layer == PeliasLayer.Country &&
      result.properties.continent
    ) {
      content += ` in ${result.properties.continent}`;
    } else if (
      result.properties.layer != PeliasLayer.Continent &&
      result.properties.country
    ) {
      content += ` in ${result.properties.country}`;
    }
    additionalText.textContent = content;

    return el;
  }

  addResult(result: PeliasGeoJSONFeature) {
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
