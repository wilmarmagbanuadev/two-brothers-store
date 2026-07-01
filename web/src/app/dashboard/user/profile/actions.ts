"use server";

import { revalidatePath } from "next/cache";

import {
  currentCustomer,
  customerDirectusRequest,
  customerSessionFromCookies
} from "@/lib/customer-directus";

type DirectusProfileResponse = {
  data: {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    location: string | null;
  };
};

export type CustomerProfile = {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
};

export type UpdateCustomerProfilePayload = {
  firstName: string;
  lastName: string;
  address: string;
};

function profileFromDirectus(profile: DirectusProfileResponse["data"]): CustomerProfile {
  return {
    email: profile.email ?? "",
    firstName: profile.first_name ?? "",
    lastName: profile.last_name ?? "",
    address: profile.location ?? ""
  };
}

function normalizeProfile(payload: UpdateCustomerProfilePayload) {
  const firstName = payload.firstName.trim();
  const lastName = payload.lastName.trim();
  const address = payload.address.trim();

  if (!firstName || !lastName) {
    throw new Error("Please enter your first and last name.");
  }

  if (firstName.length > 50 || lastName.length > 50) {
    throw new Error("First and last names must contain 50 characters or fewer.");
  }

  if (address.length > 255) {
    throw new Error("The address must contain 255 characters or fewer.");
  }

  return {
    first_name: firstName,
    last_name: lastName,
    location: address || null
  };
}

export async function loadCustomerProfile() {
  const session = await customerSessionFromCookies();
  const customer = await currentCustomer(session);

  return profileFromDirectus(customer);
}

export async function updateCustomerProfile(payload: UpdateCustomerProfilePayload) {
  const session = await customerSessionFromCookies();
  await currentCustomer(session);

  const profile = normalizeProfile(payload);
  const response = await customerDirectusRequest<DirectusProfileResponse>(
    session,
    "/users/me",
    {
      method: "PATCH",
      body: JSON.stringify(profile)
    }
  );

  revalidatePath("/dashboard/user");
  revalidatePath("/dashboard/user/profile");

  return {
    profile: profileFromDirectus(response.data)
  };
}
