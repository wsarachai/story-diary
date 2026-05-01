/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.test.json",
      },
    ],
  },
  /**
   * Redirect ALL imports of `backend/src/db` to the in-memory test database.
   * This catches any relative `../db` import from services/routes once resolved
   * to an absolute path matching this pattern.
   *
   * uuid v14 is pure ESM; redirect to a CJS-compatible test shim.
   */
  moduleNameMapper: {
    "<rootDir>/src/db(\\.ts)?$": "<rootDir>/tests/helpers/testDb",
    "^uuid$": "<rootDir>/tests/helpers/uuid-cjs",
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testMatch: ["**/*.test.ts"],
  collectCoverageFrom: ["src/routes/**/*.ts", "src/services/**/*.ts"],
  coveragePathIgnorePatterns: ["node_modules", "dist"],
  // Run tests serially to avoid session store / DB concurrency issues
  maxWorkers: 1,
};

module.exports = config;
