"use client";
import { useEffect } from "react";

export default function InitLoadingRemover() {
  useEffect(() => {
    const el = document.getElementById("init-loading");
    if (!el) return;
    el.style.opacity = "0";
    const tid = setTimeout(() => el.remove(), 500);
    return () => clearTimeout(tid);
  }, []);
  return null;
}
