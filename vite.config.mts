import * as path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  base: "./",
  build: {
    minify: "oxc",
    lib: {
      entry: path.resolve(import.meta.dirname, "src/index.ts"),
      name: "maplibreSearchBox",
    },
    rolldownOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ["maplibre-gl"],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {},
      },
    },
    sourcemap: true,
  },
  test: {
    environment: "jsdom",
  },
  plugins: [dts()],
});
