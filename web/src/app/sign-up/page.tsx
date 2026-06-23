import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Start shopping and managing orders faster.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <Input type="text" placeholder="Full name" />
            <Input type="email" placeholder="Email address" />
            <Input type="password" placeholder="Password" />
            <Button className="w-full" type="submit">Sign Up</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link href="/sign-in/user" className="font-medium text-primary">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
