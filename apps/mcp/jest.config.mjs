/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  // The watchman crawler makes every run depend on an external daemon; this app has no watch mode.
  watchman: false,
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
