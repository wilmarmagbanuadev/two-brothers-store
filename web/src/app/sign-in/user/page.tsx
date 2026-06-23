import Link from "next/link";
import { User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function UserSignInPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <User className="h-8 w-8 text-primary" />
          <CardTitle className="pt-3">Log In</CardTitle>
          <CardDescription>Sign in as a customer using social login or email and password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4">
            <Input type="email" placeholder="Email address" />
            <Input type="password" placeholder="Password" />
            <Button asChild className="w-full">
              <Link href="/dashboard/user">Log In</Link>
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">or continue with</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid gap-3">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/user">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border text-sm font-bold text-primary">G</span>
                Continue with Gmail
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/user">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">f</span>
                Continue with Facebook
              </Link>
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Need an account?{" "}
            <Link href="/sign-up" className="font-medium text-primary">Sign Up</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
