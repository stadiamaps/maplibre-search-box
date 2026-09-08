import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { MapLibreSearchControl } from "../src";
import { IControl, Map } from "maplibre-gl";
import { FeaturePropertiesV2 } from "@stadiamaps/api";

describe("search-control", () => {
  // maplibre-gl's Map constructor requires a real WebGL2 context, which jsdom
  // cannot provide, so we stand in the only part of the map `onAdd` touches.
  // What we actually want to assert on is the markup the control itself builds.
  function fakeMap(): Map {
    return { _container: document.createElement("div") } as unknown as Map;
  }

  // The bundler inlines our SVG assets as data URIs, which would otherwise dump
  // kilobytes of encoded markup into the snapshot and churn on every re-encode.
  function withoutInlinedAssets(el: HTMLElement): HTMLElement {
    const clone = el.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll<HTMLImageElement>('img[src^="data:"]')
      .forEach(img => img.setAttribute("src", "data:<inlined>"));

    return clone;
  }

  function place(name: string): FeaturePropertiesV2 {
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-93.2650478, 44.9772995] },
      properties: {
        gid: `openstreetmap:poi:node/${name}`,
        layer: "poi",
        name,
        precision: "point",
      },
    };
  }

  it("exists", () => {
    const control = new MapLibreSearchControl({});

    expect(control).toBeInstanceOf(MapLibreSearchControl);
    expectTypeOf(control).toMatchTypeOf<IControl>();
  });

  it("defaults lang to null", () => {
    const control = new MapLibreSearchControl({});

    expect(control.options.lang).toBeNull();
  });

  it("accepts a lang option", () => {
    const control = new MapLibreSearchControl({ lang: "fr" });

    expect(control.options.lang).toBe("fr");
  });

  it("can be added to map", () => {
    const control = new MapLibreSearchControl({});

    expect(withoutInlinedAssets(control.onAdd(fakeMap()))).toMatchSnapshot();
  });

  it("removes its container from the map", () => {
    const control = new MapLibreSearchControl({});
    const map = fakeMap();
    const container = control.onAdd(map);
    document.body.appendChild(container);

    control.onRemove(map);

    expect(container.parentNode).toBeNull();
    expect(control.getContainer()).toBeNull();
  });

  describe("text options", () => {
    function noResultText(control: MapLibreSearchControl): string | undefined {
      control.onAdd(fakeMap());
      control.onNoResults();

      return control.getContainer().querySelector(".no-result")?.textContent;
    }

    it("uses the default placeholder when none is provided", () => {
      const control = new MapLibreSearchControl({});
      const input = control.buildInput().querySelector("input");

      expect(input?.placeholder).toBe("Search for places...");
    });

    it("uses the configured placeholder when provided", () => {
      const control = new MapLibreSearchControl({
        placeholder: "Suche nach Orten...",
      });
      const input = control.buildInput().querySelector("input");

      expect(input?.placeholder).toBe("Suche nach Orten...");
    });

    it("uses the default no-results message when none is provided", () => {
      expect(noResultText(new MapLibreSearchControl({}))).toBe(
        "No Results Found"
      );
    });

    it("uses the configured no-results message when provided", () => {
      const control = new MapLibreSearchControl({
        noResults: "Keine Ergebnisse gefunden",
      });

      expect(noResultText(control)).toBe("Keine Ergebnisse gefunden");
    });

    it("defaults both text options to null", () => {
      const control = new MapLibreSearchControl({});

      expect(control.options.placeholder).toBeNull();
      expect(control.options.noResults).toBeNull();
    });
  });

  describe("keyboard navigation", () => {
    // jsdom implements neither layout nor `scrollIntoView`, so the most we can
    // observe here is which result the control asks the browser to reveal;
    // that the browser then scrolls only as far as needed is `nearest`'s job.
    function resultsList(count: number): {
      control: MapLibreSearchControl;
      list: HTMLElement;
      revealed: () => (string | undefined)[];
    } {
      const control = new MapLibreSearchControl({});
      control.onAdd(fakeMap());

      const features = Array.from({ length: count }, (_, i) =>
        place(`Result ${i}`)
      );
      control["resultFeatures"] = features;
      features.forEach(feature => control.addResult(feature));

      const list = control
        .getContainer()
        .querySelector<HTMLElement>(".results-list");
      const calls: Element[] = [];
      Array.from(list.children).forEach(result => {
        result.scrollIntoView = vi.fn((options?: unknown) => {
          expect(options).toEqual({ block: "nearest" });
          calls.push(result);
        });
      });

      return {
        control,
        list,
        revealed: () =>
          calls.map(
            result => result.querySelector(".result-label")?.textContent
          ),
      };
    }

    function arrow(control: MapLibreSearchControl, key: string, times = 1) {
      for (let i = 0; i < times; i++) {
        control.handleArrowKey(key);
      }
    }

    it("reveals each result as the selection moves down", () => {
      const { control, revealed } = resultsList(6);

      arrow(control, "ArrowDown", 3);

      expect(revealed()).toEqual(["Result 0", "Result 1", "Result 2"]);
    });

    it("reveals each result as the selection moves back up", () => {
      const { control, revealed } = resultsList(6);

      arrow(control, "ArrowDown", 6);
      arrow(control, "ArrowUp", 2);

      expect(revealed().slice(-2)).toEqual(["Result 4", "Result 3"]);
    });

    it("stops revealing once the selection leaves the list", () => {
      const { control, revealed } = resultsList(6);

      arrow(control, "ArrowDown"); // Selects the first result
      arrow(control, "ArrowUp"); // ...and returns to the input

      expect(revealed()).toEqual(["Result 0"]);
    });

    it("reveals only the selected result", () => {
      const { control, list } = resultsList(6);

      arrow(control, "ArrowDown", 2);

      expect(list.children[0].scrollIntoView).toHaveBeenCalledTimes(1);
      expect(list.children[1].scrollIntoView).toHaveBeenCalledTimes(1);
      expect(list.children[2].scrollIntoView).not.toHaveBeenCalled();
    });

    it("returns to the top of the list when the results are replaced", () => {
      const { control, list } = resultsList(6);

      list.scrollTop = 140;
      control.clearResults();

      expect(list.scrollTop).toBe(0);
    });
  });

  describe("hideResultsOnBlur", () => {
    function control(options: Partial<MapLibreSearchControl["options"]> = {}): {
      input: HTMLInputElement;
      results: HTMLElement;
    } {
      const control = new MapLibreSearchControl(options);
      const container = control.onAdd(fakeMap());
      // jsdom only dispatches focus and blur for elements in the document.
      document.body.replaceChildren(container);

      const features = [place("Target Field"), place("Nicollet Mall")];
      control["resultFeatures"] = features;
      features.forEach(feature => control.addResult(feature));

      return {
        input: container.querySelector("input"),
        results: container.querySelector<HTMLElement>(".results"),
      };
    }

    function hidden(results: HTMLElement): boolean {
      return results.classList.contains("hidden");
    }

    function mousedown(target: Element): boolean {
      const event = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
      });
      target.dispatchEvent(event);

      return event.defaultPrevented;
    }

    it("defaults to off", () => {
      expect(new MapLibreSearchControl({}).options.hideResultsOnBlur).toBe(
        false
      );
    });

    it("keeps the results visible on blur by default", () => {
      const { input, results } = control();

      input.focus();
      input.blur();

      expect(hidden(results)).toBe(false);
    });

    it("hides the results on blur when enabled", () => {
      const { input, results } = control({ hideResultsOnBlur: true });

      input.focus();
      expect(hidden(results)).toBe(false);

      input.blur();

      expect(hidden(results)).toBe(true);
    });

    it("brings the same results back when the input is refocused", () => {
      const { input, results } = control({ hideResultsOnBlur: true });

      input.focus();
      input.blur();
      input.focus();

      expect(hidden(results)).toBe(false);
      expect(results.querySelectorAll(".result")).toHaveLength(2);
    });

    // Without this, the blur would hide the list out from under the click.
    it("keeps focus on the input when a result is pressed", () => {
      const { results } = control({ hideResultsOnBlur: true });

      expect(mousedown(results.querySelector(".result"))).toBe(true);
    });

    it("leaves mousedown in the results alone when disabled", () => {
      const { results } = control();

      expect(mousedown(results.querySelector(".result"))).toBe(false);
    });
  });

  describe("animationOptions", () => {
    // `onSelected` only touches the camera methods when the feature already
    // carries a geometry, so no API calls happen in any of these tests.
    function cameraMap() {
      const camera = {
        flyTo: vi.fn(),
        jumpTo: vi.fn(),
        fitBounds: vi.fn(),
      };

      return { camera, map: camera as unknown as Map };
    }

    function feature(
      overrides: Partial<FeaturePropertiesV2> = {}
    ): FeaturePropertiesV2 {
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [-93.2650478, 44.9772995] },
        properties: {
          gid: "openstreetmap:poi:node/1",
          layer: "poi",
          name: "Target Field",
          precision: "point",
        },
        ...overrides,
      };
    }

    function control(
      options: Partial<MapLibreSearchControl["options"]> = {}
    ): [MapLibreSearchControl, ReturnType<typeof cameraMap>["camera"]] {
      const { camera, map } = cameraMap();
      const control = new MapLibreSearchControl(options);
      control.onAdd(map);

      return [control, camera];
    }

    it("defaults to null", () => {
      expect(new MapLibreSearchControl({}).options.animationOptions).toBeNull();
    });

    it("flies to the result by default", async () => {
      const [searchControl, camera] = control();

      await searchControl.onSelected(feature());

      expect(camera.flyTo).toHaveBeenCalledWith({
        center: [-93.2650478, 44.9772995],
        zoom: 16,
      });
      expect(camera.jumpTo).not.toHaveBeenCalled();
    });

    it("passes the animation options through to flyTo", async () => {
      const easing = (t: number) => t;
      const [searchControl, camera] = control({
        animationOptions: { duration: 250, easing },
      });

      await searchControl.onSelected(feature());

      expect(camera.flyTo).toHaveBeenCalledWith({
        center: [-93.2650478, 44.9772995],
        zoom: 16,
        duration: 250,
        easing,
      });
    });

    it("jumps to the result when animation is disabled", async () => {
      const [searchControl, camera] = control({
        animationOptions: { animate: false },
      });

      await searchControl.onSelected(feature());

      expect(camera.jumpTo).toHaveBeenCalledWith({
        center: [-93.2650478, 44.9772995],
        zoom: 16,
      });
      expect(camera.flyTo).not.toHaveBeenCalled();
    });

    it("passes the animation options through to fitBounds", async () => {
      const [searchControl, camera] = control({
        animationOptions: { duration: 250 },
      });

      await searchControl.onSelected(feature({ bbox: [-1, -2, 3, 4] }));

      expect(camera.fitBounds).toHaveBeenCalledWith(
        [
          [-1, -2],
          [3, 4],
        ],
        { duration: 250 }
      );
    });

    // `fitBounds` hands off to `flyTo`, which ignores `animate`, unless we also
    // ask for the linear (`easeTo`) path, which honors it by zeroing the duration.
    it("makes fitBounds linear when animation is disabled", async () => {
      const [searchControl, camera] = control({
        animationOptions: { animate: false },
      });

      await searchControl.onSelected(feature({ bbox: [-1, -2, 3, 4] }));

      expect(camera.fitBounds).toHaveBeenCalledWith(
        [
          [-1, -2],
          [3, 4],
        ],
        { animate: false, linear: true }
      );
    });
  });
});
