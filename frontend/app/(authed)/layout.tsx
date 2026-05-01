import AuthedShell from "@/components/AuthedShell";

/**
 * (authed) route group layout.
 * Wraps all authenticated pages with the auth guard.
 * Each page renders BookShellLayout with rail={<IconRail />} to compose the icon rail.
 */
export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  return <AuthedShell>{children}</AuthedShell>;
}
