"use client";

import { FormEvent, useState } from "react";
import { Mail, MapPin, Save, User } from "lucide-react";

import {
  CustomerProfile,
  updateCustomerProfile
} from "@/app/dashboard/user/profile/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function CustomerProfileForm({ initialProfile }: { initialProfile: CustomerProfile }) {
  const [profile, setProfile] = useState(initialProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const result = await updateCustomerProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        address: profile.address
      });

      setProfile(result.profile);
      setSuccess("Your profile has been updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update your profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Customer Details</CardTitle>
        <CardDescription>Your account and delivery information.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
              {success}
            </div>
          ) : null}

          <label className="grid gap-2 text-sm font-medium">
            Email
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={profile.email} disabled className="pl-9" />
            </div>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              First Name
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={profile.firstName}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, firstName: event.target.value }))
                  }
                  className="pl-9"
                  maxLength={50}
                  autoComplete="given-name"
                  required
                />
              </div>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Last Name
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={profile.lastName}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, lastName: event.target.value }))
                  }
                  className="pl-9"
                  maxLength={50}
                  autoComplete="family-name"
                  required
                />
              </div>
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            Address
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <textarea
                value={profile.address}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, address: event.target.value }))
                }
                className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm"
                maxLength={255}
                autoComplete="street-address"
              />
            </div>
          </label>

          <div>
            <Button type="submit" disabled={isSaving}>
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
