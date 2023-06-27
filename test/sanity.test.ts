import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { MapLibreSearchControl } from "../src";
import { IControl, Map } from "maplibre-gl";

describe("search-control", () => {
  function setupMap() {
    const mapEl = document.createElement("div");
    mapEl.id = "map";
    document.body.appendChild(mapEl);

    const control = new MapLibreSearchControl({});
    const map = new Map({
      container: "map",
      style: "https://tiles.stadiamaps.com/styles/alidade_smooth.json",
      center: [-74.5, 40],
      zoom: 2,
    });
    map.addControl(control);

    return {
      mapEl,
      map,
      control,
    };
  }

  it("exists", () => {
    const control = new MapLibreSearchControl({});

    expect(control).toBeInstanceOf(MapLibreSearchControl);
    expectTypeOf(control).toMatchTypeOf<IControl>();
  });

  it("can be added to map", () => {
    const { mapEl } = setupMap();
    expect(mapEl).toMatchSnapshot();
  });
});
