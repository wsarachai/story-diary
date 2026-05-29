/**
 * renderWithProviders — test render utility
 *
 * Adapts the "fresh-store-per-test" pattern for our RTK Query stack.
 *
 * Why not just use <Providers> from the app?
 * ─────────────────────────────────────────
 * The app's <Providers> wraps the singleton `store` (store/index.ts).
 * Sharing one store across tests causes cache pollution — a query result
 * from test A leaks into test B unless you manually call
 *   store.dispatch(apiSlice.util.resetApiState())
 * before every test.  That's easy to forget and produces mysterious failures.
 *
 * This utility creates a **brand-new store for every render call**, so each
 * test starts with a clean slate automatically.
 *
 * Usage
 * ─────
 * // Simplest — fresh store, MSW handles the network
 * const { getByText } = renderWithProviders(<MyPage />);
 *
 * // Share one store across multiple renders in the same test
 * const { store } = renderWithProviders(<ComponentA />);
 * renderWithProviders(<ComponentB />, { store });
 *
 * API
 * ───
 * renderWithProviders(ui, options?) → RenderResult & { store }
 *
 *   options.store  – use an existing store (skips store creation)
 *   options.*      – forwarded to @testing-library/react render()
 */

import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { Provider } from "react-redux";
import { apiSlice } from "@/store/apiSlice";

// ─── store factory ────────────────────────────────────────────────────────────

/**
 * Creates an isolated test store — exact same shape as the integration tests
 * that already pass (no preloadedState to avoid RTK 2.x generic conflicts).
 * All test data is supplied via MSW handlers instead.
 */
export function createTestStore() {
  return configureStore({
    reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (gdm) =>
      gdm({ serializableCheck: false, immutableCheck: false })
        .concat(apiSlice.middleware),
  });
}

export type TestStore = ReturnType<typeof createTestStore>;

// ─── renderWithProviders ──────────────────────────────────────────────────────

interface Options extends Omit<RenderOptions, "wrapper"> {
  /**
   * Pass an existing TestStore to share one store across multiple renders
   * in the same test.  When omitted a fresh store is created.
   */
  store?: TestStore;
}

interface Result extends RenderResult {
  /** The store instance used for this render — useful for asserting state. */
  store: TestStore;
}

export function renderWithProviders(
  ui: React.ReactElement,
  { store, ...renderOptions }: Options = {}
): Result {
  // ← fresh store every call (unless caller shares one explicitly)
  const testStore = store ?? createTestStore();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={testStore}>{children}</Provider>;
  }

  return {
    store: testStore,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}
