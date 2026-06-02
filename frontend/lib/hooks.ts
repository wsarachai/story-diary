"use client";

import { useSyncExternalStore } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store/index";

const HISTORY_EVENT = "story-diary:history-update";

let historyPatched = false;

function notifyLocationChange() {
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

function patchHistoryMethods() {
  if (historyPatched || typeof window === "undefined") {
    return;
  }

  const { history } = window;
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = function pushState(...args) {
    const result = originalPushState(...args);
    notifyLocationChange();
    return result;
  };

  history.replaceState = function replaceState(...args) {
    const result = originalReplaceState(...args);
    notifyLocationChange();
    return result;
  };

  historyPatched = true;
}

function subscribeToLocation(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  patchHistoryMethods();
  window.addEventListener("popstate", callback);
  window.addEventListener(HISTORY_EVENT, callback);

  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(HISTORY_EVENT, callback);
  };
}

function getSearchSnapshot() {
  return typeof window === "undefined" ? "" : window.location.search;
}

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T>(selector: (state: RootState) => T): T =>
  useSelector(selector);

export function useClientSearchParams(): URLSearchParams {
  const search = useSyncExternalStore(
    subscribeToLocation,
    getSearchSnapshot,
    () => "",
  );

  return new URLSearchParams(search);
}
