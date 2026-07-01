import Link from "next/link";
import { User } from "lucide-react";

import { UserLoginForm } from "@/components/auth/user-login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserSignInPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <User className="h-8 w-8 text-primary" />
          <CardTitle className="pt-3">Log In</CardTitle>
          <CardDescription>Log in with your customer email and password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UserLoginForm />

          <p className="text-center text-sm text-muted-foreground">
            Need an account?{" "}
            <Link href="/sign-up" className="font-medium text-primary">Sign Up</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
