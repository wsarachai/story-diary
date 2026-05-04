/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests/integration"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.test.json",
      },
    ],
  },
  moduleNameMapper: {
    "^uuid$": "<rootDir>/tests/helpers/uuid-mongo.js",
  },
  setupFilesAfterEnv: ["<rootDir>/tests/integration/setup.ts"],
  testMatch: ["**/*.test.ts"],
  maxWorkers: 1,
  testTimeout: 30000,
};

module.exports = config;
