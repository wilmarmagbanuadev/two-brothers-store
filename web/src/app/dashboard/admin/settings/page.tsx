import { Breadcrumbs } from "@/components/breadcrumbs";

export default function AdminSettingsPage() {
  return (
    <main className="py-10">
      <Breadcrumbs items={[{ label: "Dashboard" }, { label: "Admin", href: "/dashboard/admin" }, { label: "Settings" }]} />
      <h1 className="text-3xl font-bold tracking-normal">Settings</h1>
      <p className="mt-2 text-muted-foreground">Admin settings will live here.</p>
    </main>
  );
}
