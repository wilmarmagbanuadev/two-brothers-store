const directusUrl = process.env.DIRECTUS_URL ?? process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";

type DirectusMeResponse = {
  data?: {
    role?: string | {
      id?: string;
      name?: string;
    };
  };
};

type DirectusRoleResponse = {
  data?: {
    name?: string;
  };
};

async function fetchRoleName(path: string, accessToken: string) {
  const response = await fetch(`${directusUrl.replace(/\/$/, "")}${path}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as DirectusRoleResponse;

  return data.data?.name ?? null;
}

export async function roleNameFromAccessToken(accessToken: string) {
  const response = await fetch(`${directusUrl.replace(/\/$/, "")}/users/me?fields=role,role.name`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });  
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as DirectusMeResponse;
  const role = data.data?.role;

  if (!role) {
    return null;
  }

  if (typeof role === "object") {
    if (role.name) {
      return role.name;
    }

    if (role.id) {
      return (await fetchRoleName(`/roles/${encodeURIComponent(role.id)}?fields=name`, accessToken))
        ?? (await fetchRoleName(`/items/directus_roles/${encodeURIComponent(role.id)}?fields=name`, accessToken));
    }
  }

  if (typeof role === "string") {
    return (await fetchRoleName(`/roles/${encodeURIComponent(role)}?fields=name`, accessToken))
      ?? (await fetchRoleName(`/items/directus_roles/${encodeURIComponent(role)}?fields=name`, accessToken));
  }

  return null;
}
