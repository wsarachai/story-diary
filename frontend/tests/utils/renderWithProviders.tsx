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
 * // Pre-seed the RTK Query cache (skip the network round-trip)
 * const { store } = renderWithProviders(<MyPage />, {
 *   preloadedState: buildCacheState({ getMe: MOCK_USER }),
 * });
 *
 * // Share one store across multiple renders in the same test
 * const { store } = renderWithProviders(<ComponentA />);
 * renderWithProviders(<ComponentB />, { store });
 *
 * API
 * ───
 * renderWithProviders(ui, options?) → RenderResult & { store }
 *
 *   options.preloadedState  – partial Redux state to pre-seed the store
 *   options.store           – use an existing store (skips store creation)
 *   options.*               – forwarded to @testing-library/react render()
 */

import React from "react";
import { configureStore, type PreloadedState } from "@reduxjs/toolkit";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { Provider } from "react-redux";
import { apiSlice } from "@/store/apiSlice";
import type { RootState } from "@/store/index";

// ─── store factory ───────────────────────────────────────────────────────────

/**
 * Creates an isolated test store with the same shape as the production store
 * but without the singleton reference.
 */
export function createTestStore(preloadedState?: PreloadedState<RootState>) {
  return configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }).concat(apiSlice.middleware),
    preloadedState,
  });
}

export type TestStore = ReturnType<typeof createTestStore>;

// ─── cache pre-seeder ─────────────────────────────────────────────────────────

/**
 * Helper to build a preloadedState that seeds specific RTK Query cache entries
 * so the component never has to make a network request in tests that only care
 * about UI behaviour (not the fetch itself).
 *
 * Example:
 *   renderWithProviders(<ProfilePage />, {
 *     preloadedState: buildCacheState({ 'getMe(undefined)': MOCK_USER }),
 *   });
 */
export function buildCacheState(
  queries: Record<string, unknown>
): PreloadedState<RootState> {
  const queryState: Record<string, unknown> = {};
  for (const [key, data] of Object.entries(queries)) {
    queryState[key] = {
      status: "fulfilled",
      endpointName: key.split("(")[0],
      requestId: `test-${key}`,
      data,
      fulfilledTimeStamp: Date.now(),
      isUninitialized: false,
      isLoading: false,
      isSuccess: true,
      isError: false,
    };
  }
  return {
    [apiSlice.reducerPath]: {
      queries: queryState,
      mutations: {},
      provided: {},
      subscriptions: {},
      config: {
        online: true,
        focused: true,
        middlewareRegistered: true,
        refetchOnFocus: false,
        refetchOnReconnect: false,
        refetchOnMountOrArgChange: false,
        keepUnusedDataFor: 60,
        reducerPath: apiSlice.reducerPath,
      },
    },
  } as PreloadedState<RootState>;
}

// ─── renderWithProviders ─────────────────────────────────────────────────────

interface Options extends Omit<RenderOptions, "wrapper"> {
  /** Partial Redux initial state — good for pre-seeding RTK Query cache. */
  preloadedState?: PreloadedState<RootState>;
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
  { preloadedState, store, ...renderOptions }: Options = {}
): Result {
  // ← create a fresh store every call (unless caller supplies one)
  const testStore = store ?? createTestStore(preloadedState);

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={testStore}>{children}</Provider>;
  }

  return {
    store: testStore,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}
