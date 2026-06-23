import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
          <form className="space-y-4">
            <Input type="email" placeholder="Email address" />
            <Input type="password" placeholder="Password" />
            <Button asChild className="w-full">
              <Link href="/dashboard/admin">Log In</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
