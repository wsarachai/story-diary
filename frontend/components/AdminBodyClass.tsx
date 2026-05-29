"use client";
import { useEffect } from "react";

/** Stamps data-admin on <body> while any admin page is mounted.
 *  This lets globals.css override the book-shell body layout for admin routes
 *  without requiring position:fixed (which can be blocked by CSS caching). */
export default function AdminBodyClass() {
  useEffect(() => {
    document.body.setAttribute("data-admin", "true");
    return () => document.body.removeAttribute("data-admin");
  }, []);
  return null;
}
