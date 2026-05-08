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
    moduleNameMapper: {
        "^uuid$": "<rootDir>/tests/helpers/uuid-cjs",
    },
    setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
    testMatch: ["**/*.test.ts"],
    collectCoverageFrom: ["src/routes/**/*.ts", "src/services/**/*.ts"],
    coveragePathIgnorePatterns: ["node_modules", "dist"],
    maxWorkers: 1,
};

module.exports = config;
