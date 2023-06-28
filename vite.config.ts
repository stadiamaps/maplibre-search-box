/// <reference types="vitest" />
import * as path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

module.exports = defineConfig({
  base: "./",
  build: {
    minify: "esbuild",
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "maplibreSearchBox"
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ["maplibre-gl"],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {}
      }
    },
    sourcemap: true
  },
  test: {},
  plugins: [dts()]
});
