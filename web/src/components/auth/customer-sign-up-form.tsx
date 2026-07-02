"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { signUpCustomer } from "@/app/sign-up/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CustomerSignUpForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      const result = await signUpCustomer({
        firstName,
        lastName,
        email,
        password
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setIsComplete(true);
      setPassword("");
    } catch {
      setError("Unable to create your account right now. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isComplete) {
    return (
      <div className="rounded-md border border-primary/30 bg-primary/10 p-4 text-sm">
        <div className="flex items-center gap-2 font-semibold text-primary">
          <CheckCircle2 className="h-5 w-5" />
          Registration received
        </div>
        <p className="mt-2 text-muted-foreground">
          Your account is waiting for store approval. You can sign in after an admin activates it.
        </p>
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          First Name
          <Input
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            autoComplete="given-name"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Last Name
          <Input
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            autoComplete="family-name"
            required
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium">
        Email Address
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>

      <label className="grid gap-2 text-sm font-medium">
        Password
        <Input
          type="password"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
        <span className="text-xs font-normal text-muted-foreground">Use at least 8 characters.</span>
      </label>

      <Button className="w-full" type="submit" disabled={isSaving}>
        {isSaving ? "Creating Account..." : "Create Account"}
      </Button>
    </form>
  );
}
