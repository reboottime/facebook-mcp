/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  // The watchman crawler makes every run depend on an external daemon; this app has no watch mode.
  watchman: false,
  // `test` depends on `build`, so dist/ is populated whenever jest runs; without this it would
  // collect any compiled leftovers as a second copy of every suite.
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  // The integration suites boot a PGlite instance, apply migrations, and stand up two HTTP
  // servers per stack; the 5s default expires during the WASM database start alone.
  testTimeout: 120_000,
  // Source uses NodeNext-style ".js" specifiers; jest resolves against the ".ts" files.
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "ESNext",
          moduleResolution: "Bundler",
          verbatimModuleSyntax: false,
        },
      },
    ],
  },
};

export default config;
