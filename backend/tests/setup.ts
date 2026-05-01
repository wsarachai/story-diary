// Global test setup for backend API tests
// Jest runs this after the test framework is installed in the environment.

jest.mock("../src/db", () => require("./helpers/testDb"));
