const directusUrl = process.env.DIRECTUS_URL ?? process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";
const directusToken = process.env.DIRECTUS_STATIC_TOKEN;

export type Category = {
  name: string;
  slug: string;
  imageUrl: string;
  sortOrder: number | null;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  categorySlug: string;
  price: string;
  description: string;
  image: string;
  featured?: boolean;
};

type DirectusListResponse<T> = {
  data: T[];
};

type DirectusCategory = {
  name: string;
  slug: string;
  sort_order: number | null;
  image_url: string | null;
};

type DirectusProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string | number;
  image_url: string | null;
  is_featured: boolean;
  category_id: DirectusCategory | null;
};

function money(value: string | number) {
  const numericValue = typeof value === "number" ? value : Number(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(numericValue);
}

function directusAssetUrl(fileId: string) {
  return `${directusUrl.replace(/\/$/, "")}/assets/${fileId}`;
}

function imageUrl(value: string | null) {
  if (!value) {
    return "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80";
  }

  if (value.startsWith("http")) {
    return value;
  }

  return directusAssetUrl(value);
}

function productImage(product: DirectusProduct) {
  return imageUrl(product.image_url);
}

function mapCategory(category: DirectusCategory): Category {
  return {
    name: category.name,
    slug: category.slug,
    imageUrl: imageUrl(category.image_url),
    sortOrder: category.sort_order
  };
}

function mapProduct(product: DirectusProduct): Product {
  return {
    id: product.slug,
    name: product.name,
    category: product.category_id?.name ?? "Others",
    categorySlug: product.category_id?.slug ?? "others",
    price: money(product.price),
    description: product.description ?? "",
    image: productImage(product),
    featured: product.is_featured
  };
}

async function directusFetch<T>(path: string) {
  const response = await fetch(`${directusUrl.replace(/\/$/, "")}${path}`, {
    cache: "no-store",
    headers: directusToken
      ? {
          Authorization: `Bearer ${directusToken}`
        }
      : undefined
  });

  if (!response.ok) {
    throw new Error(`Directus request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function getCategories() {
  const response = await directusFetch<DirectusListResponse<DirectusCategory>>(
    "/items/categories?fields=name,slug,image_url,sort_order&filter[is_active][_eq]=true&sort=sort_order"
  );

  return response.data.map(mapCategory);
}

export async function getProducts() {
  const response = await directusFetch<DirectusListResponse<DirectusProduct>>(
    "/items/products?fields=id,name,slug,description,price,image_url,is_featured,category_id.name,category_id.slug&filter[status][_eq]=active&sort=name"
  );

  return response.data.map(mapProduct);
}

export async function getProduct(slug: string) {
  const response = await directusFetch<DirectusListResponse<DirectusProduct>>(
    `/items/products?fields=id,name,slug,description,price,image_url,is_featured,category_id.name,category_id.slug&filter[slug][_eq]=${encodeURIComponent(slug)}&limit=1`
  );

  if (response.data[0]) {
    return mapProduct(response.data[0]);
  }

  return undefined;
}

export async function getCategoriesState() {
  try {
    return {
      data: await getCategories(),
      offline: false
    };
  } catch {
    return {
      data: [] as Category[],
      offline: true
    };
  }
}

export async function getProductsState() {
  try {
    return {
      data: await getProducts(),
      offline: false
    };
  } catch {
    return {
      data: [] as Product[],
      offline: true
    };
  }
}
