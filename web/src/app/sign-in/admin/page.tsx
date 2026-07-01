import { LockKeyhole } from "lucide-react";

import { AdminLoginForm } from "@/components/auth/admin-login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminSignInPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <LockKeyhole className="h-8 w-8 text-primary" />
          <CardTitle className="pt-3">Log In</CardTitle>
          <CardDescription>Log in with email and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminLoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
