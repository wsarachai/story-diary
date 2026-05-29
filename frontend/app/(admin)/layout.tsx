import AdminShell from "@/components/AdminShell";
import AdminBodyClass from "@/components/AdminBodyClass";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell>
      <AdminBodyClass />
      {children}
    </AdminShell>
  );
}
