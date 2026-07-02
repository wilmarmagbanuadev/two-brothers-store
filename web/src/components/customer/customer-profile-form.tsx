import { Mail, User } from "lucide-react";

import type { CustomerProfile } from "@/app/dashboard/user/profile/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function CustomerProfileForm({ initialProfile }: { initialProfile: CustomerProfile }) {
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Customer Details</CardTitle>
        <CardDescription>Your Directus customer account information.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-5">
          <label className="grid gap-2 text-sm font-medium">
            Email
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={initialProfile.email} readOnly className="pl-9 text-muted-foreground" />
            </div>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              First Name
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={initialProfile.firstName}
                  readOnly
                  className="pl-9 text-muted-foreground"
                />
              </div>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Last Name
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={initialProfile.lastName}
                  readOnly
                  className="pl-9 text-muted-foreground"
                />
              </div>
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
