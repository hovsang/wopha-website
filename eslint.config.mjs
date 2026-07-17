export default [
  { ignores: ["node_modules/**", "**/.wrangler/**", "docs/**", "_site/**"] },
  {
    files: ["src/assets/js/*.js", "src/portal/*.js", "src/sw.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        document: "readonly", window: "readonly", fetch: "readonly",
        navigator: "readonly", caches: "readonly", self: "readonly",
        URL: "readonly", confirm: "readonly", setTimeout: "readonly",
        clearTimeout: "readonly", localStorage: "readonly",
        location: "readonly", history: "readonly", FileReader: "readonly",
        Promise: "readonly", Object: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", {
        args: "none",
        caughtErrors: "none",
        varsIgnorePattern: "^(api|showError|clearError|portalSummary|el|dollars|TYPE_LABELS|toast|confirmDialog|skeleton|initTabs)$",
      }],
      "eqeqeq": ["warn", "smart"],
      "no-redeclare": "error",
    },
  },
  {
    files: ["functions/**/*.js", "workers/**/*.js", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        Response: "readonly", fetch: "readonly", URL: "readonly",
        Request: "readonly", console: "readonly", URLSearchParams: "readonly",
        crypto: "readonly", TextEncoder: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none", varsIgnorePattern: "^_" }],
      "eqeqeq": ["warn", "smart"],
      "no-redeclare": "error",
    },
  },
  {
    files: ["eleventy.config.js", "src/*.11tydata.js", "tools/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { console: "readonly", process: "readonly" },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none", varsIgnorePattern: "^_" }],
      "eqeqeq": ["warn", "smart"],
      "no-redeclare": "error",
    },
  },
];
