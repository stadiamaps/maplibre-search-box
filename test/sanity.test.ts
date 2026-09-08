import { describe, expect, expectTypeOf, it } from "vitest";
import { MapLibreSearchControl } from "../src";
import { IControl, Map } from "maplibre-gl";

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
});
