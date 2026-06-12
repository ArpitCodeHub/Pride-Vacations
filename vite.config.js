import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite is configured to mirror Create-React-App's behavior for this project
// so the SPA renders identically:
//   - JSX in plain `.js` files is supported via esbuild's jsx loader
//   - Output goes to `dist/` (Vercel's Vite preset default)
//   - Dev server defaults to localhost:3000 (CRA parity)
//   - Vitest runs in jsdom so the api.js facade tests behave like Jest's CRA setup
export default defineConfig({
  plugins: [react()],
  esbuild: {
    // Allow JSX inside .js files (the project still has a few legacy ones)
    loader: "jsx",
    include: /src\/.*\.(js|jsx)$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { ".js": "jsx" },
    },
  },
  build: {
    outDir: "dist",
  },
  server: {
    port: 3000,
  },
  test: {
    environment: "jsdom",
    globals: false,
    // The api/ tests use Node's built-in node:test runner (CommonJS).
    // Run them via `npm run test:api`. Excluded from Vitest discovery.
    exclude: ["**/node_modules/**", "**/dist/**", "api/**"],
  },
});
