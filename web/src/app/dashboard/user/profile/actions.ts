import "server-only";

import {
  currentCustomer,
  customerSessionFromCookies
} from "@/lib/customer-directus";
import { directusSystemRequest } from "@/lib/directus-system";

type DirectusProfileResponse = {
  data: {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  };
};

export type CustomerProfile = {
  email: string;
  firstName: string;
  lastName: string;
};

function profileFromDirectus(profile: DirectusProfileResponse["data"]): CustomerProfile {
  return {
    email: profile.email ?? "",
    firstName: profile.first_name ?? "",
    lastName: profile.last_name ?? ""
  };
}

async function loadDirectusProfile(userId: string) {
  const response = await directusSystemRequest<DirectusProfileResponse>(
    `/users/${encodeURIComponent(userId)}?fields=email,first_name,last_name`
  );

  return response?.data ?? null;
}

export async function loadCustomerProfile() {
  const session = await customerSessionFromCookies();
  const customer = await currentCustomer(session);
  const profile = await loadDirectusProfile(customer.id);

  return profileFromDirectus(profile ?? customer);
}
