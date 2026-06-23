import Link from "next/link";
import { ShieldCheck, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const dashboardTypes = [
  {
    href: "/dashboard/user",
    title: "User Dashboard",
    description: "Track orders, checkout activity, saved details, and recent purchases.",
    icon: ShoppingBag
  },
  {
    href: "/dashboard/admin",
    title: "Admin Dashboard",
    description: "Manage orders, inventory, products, customers, and store performance.",
    icon: ShieldCheck
  }
];

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-normal">Dashboards</h1>
        <p className="mt-2 text-muted-foreground">Choose the customer or admin workspace.</p>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        {dashboardTypes.map((dashboard) => {
          const Icon = dashboard.icon;
          return (
            <Card key={dashboard.href}>
              <CardHeader>
                <Icon className="h-8 w-8 text-primary" />
                <CardTitle className="pt-3">{dashboard.title}</CardTitle>
                <CardDescription>{dashboard.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href={dashboard.href}>Open {dashboard.title}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
