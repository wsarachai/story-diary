"use client";

import { Provider } from "react-redux";
import { store } from "@/store/index";
import ToastViewport from "@/components/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      {children}
      <ToastViewport />
    </Provider>
  );
}
