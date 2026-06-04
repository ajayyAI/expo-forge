const reporters = [
  "default",
  ["github-actions", { silent: false }],
  "summary",
  [
    "jest-junit",
    {
      outputDirectory: "coverage",
      outputName: "jest-junit.xml",
      ancestorSeparator: " › ",
      uniqueOutputName: "false",
      suiteNameTemplate: "{filepath}",
      classNameTemplate: "{classname}",
      titleTemplate: "{title}",
    },
  ],
];

// Two projects with different runtimes:
//   - "app": React Native code under jest-expo (jsdom-flavored RN env).
//   - "convex": Convex functions tested with convex-test under the Edge
//     runtime, which mirrors Convex's V8 isolate (web crypto, fetch, no Node
//     built-ins). A minimal babel transform (TS + ESM→CJS) avoids pulling in
//     babel-preset-expo / reanimated worklets, which the backend never needs.
module.exports = {
  reporters,
  // Convex source is excluded on purpose — see the convex project's
  // coveragePathIgnorePatterns below.
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!**/coverage/**",
    "!**/node_modules/**",
    "!**/_generated/**",
    "!**/babel.config.js",
    "!**/jest-setup.ts",
    "!**/docs/**",
    "!**/cli/**",
  ],
  coverageReporters: ["json-summary", ["text", { file: "coverage.txt" }]],
  coverageDirectory: "<rootDir>/coverage/",
  projects: [
    {
      displayName: "app",
      preset: "jest-expo",
      setupFilesAfterEnv: ["<rootDir>/jest-setup.ts"],
      testMatch: ["**/?(*.)+(spec|test).ts?(x)"],
      testPathIgnorePatterns: ["<rootDir>/convex/"],
      moduleFileExtensions: ["js", "ts", "tsx"],
      transformIgnorePatterns: [
        "node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|@sentry/.*|native-base|react-native-svg|@gorhom/.*|@shopify/.*|@tanstack/.*|react-native-reanimated|react-native-mmkv|react-native-nitro-modules|react-native-worklets|moti|zustand|tailwind-merge|tailwind-variants|uniwind))",
      ],
      moduleNameMapper: {
        "^@/assets/(.*)$": "<rootDir>/assets/$1",
        "^@/(.*)$": "<rootDir>/src/$1",
      },
    },
    {
      displayName: "convex",
      testEnvironment: "@edge-runtime/jest-environment",
      // The Edge sandbox forbids `new Function`, which istanbul's coverage shim
      // needs, so convex files can't be instrumented under --coverage. Tests
      // still run; line coverage comes from the app project only.
      coveragePathIgnorePatterns: ["/node_modules/", "<rootDir>/convex/"],
      setupFilesAfterEnv: ["<rootDir>/convex/__tests__/_setup.ts"],
      testMatch: ["<rootDir>/convex/**/?(*.)+(spec|test).ts"],
      testPathIgnorePatterns: ["<rootDir>/convex/_generated/"],
      moduleFileExtensions: ["js", "mjs", "ts"],
      transform: {
        "^.+\\.[jt]sx?$|^.+\\.mjs$": [
          "babel-jest",
          {
            // Inline, self-contained Babel options (babelrc/configFile disabled)
            // so the React Native babel.config.js at the repo root never leaks
            // into backend transforms.
            babelrc: false,
            configFile: false,
            presets: [
              require.resolve("@babel/preset-typescript"),
              require.resolve("babel-preset-current-node-syntax"),
            ],
            plugins: [
              // convex-test ships an `import.meta.glob(...)` fallback that is
              // never taken here (we pass an explicit modules map) but must
              // still parse + downlevel under the CommonJS transform.
              require.resolve("./babel-plugin-stub-import-meta.cjs"),
              // convex-test loads function modules via dynamic import(); under
              // Jest's CommonJS runtime that must become a require().
              require.resolve("babel-plugin-dynamic-import-node"),
              require.resolve("@babel/plugin-transform-modules-commonjs"),
            ],
          },
        ],
      },
      // Transform the ESM-only packages the backend imports (convex-test plus
      // the Better Auth stack) down to CommonJS for the Edge-runtime env.
      transformIgnorePatterns: [
        "node_modules/(?!(convex-test|convex-helpers|better-auth|@better-auth|@convex-dev|better-call|@better-fetch|nanostores|jose|uncrypto|@noble|nanoid|zod|kysely|defu|rou3)/)",
      ],
    },
  ],
};
