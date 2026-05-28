import { defineConfig } from "vitest/config";
import path from "path";
import react from "@vitejs/plugin-react";
import esbuild from "esbuild";

export default defineConfig({
  plugins: [
    // Vite 6's OXC parser doesn't handle JSX in .js files.
    // This plugin transforms .js files through esbuild as JSX
    // before OXC gets a chance to parse them.
    {
      name: "treat-js-as-jsx",
      enforce: "pre",
      async transform(code, id) {
        if (!id.match(/\.js$/)) return;
        if (id.includes("node_modules") || id.includes(".next")) return;
        const result = await esbuild.transform(code, {
          loader: "jsx",
          jsx: "automatic",
        });
        return { code: result.code, map: null };
      },
    },
    react(),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    include: ["**/*.test.{js,jsx,ts,tsx}"],
    exclude: ["node_modules", ".next"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
