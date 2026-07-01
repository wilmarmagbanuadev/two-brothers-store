import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserSettingsPage() {
  return (
    <main className="py-10">
      <Breadcrumbs items={[{ label: "Dashboard" }, { label: "Customer", href: "/dashboard/user" }, { label: "Settings" }]} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-normal">Settings</h1>
        <p className="mt-2 text-muted-foreground">Manage account preferences.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Customer settings will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No settings available yet.</p>
        </CardContent>
      </Card>
    </main>
  );
}
