export default {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  testTimeout: 30000,
  globalTeardown: "./tests/globalTeardown.ts",
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
};
