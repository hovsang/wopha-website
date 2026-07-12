export default [
  { ignores: ["node_modules/**", "**/.wrangler/**", "docs/**"] },
  {
    files: ["assets/js/*.js", "portal/*.js", "sw.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        document: "readonly", window: "readonly", fetch: "readonly",
        navigator: "readonly", caches: "readonly", self: "readonly",
        URL: "readonly", confirm: "readonly", setTimeout: "readonly",
        Promise: "readonly", Object: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none", varsIgnorePattern: "^(api|showError|clearError)$" }],
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
        Request: "readonly", console: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none", varsIgnorePattern: "^_" }],
      "eqeqeq": ["warn", "smart"],
      "no-redeclare": "error",
    },
  },
];
