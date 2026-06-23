import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { categories, products } from "@/lib/products";

type ProductsPageProps = {
  searchParams: Promise<{
    category?: string;
    q?: string;
  }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { category, q } = await searchParams;
  const activeCategory = category ? decodeURIComponent(category) : undefined;
  const searchQuery = q ? decodeURIComponent(q).trim().toLowerCase() : "";
  const visibleProducts = products.filter((product) => {
    const matchesCategory = activeCategory ? product.category === activeCategory : true;
    const matchesSearch = searchQuery
      ? [product.name, product.category, product.description].some((value) =>
          value.toLowerCase().includes(searchQuery)
        )
      : true;

    return matchesCategory && matchesSearch;
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-normal">Products</h1>
          <p className="mt-2 text-muted-foreground">
            {searchQuery
              ? `Search results for "${q}"`
              : "Browse the catalog by category or open a single product page."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant={!activeCategory && !searchQuery ? "default" : "outline"} size="sm">
            <Link href="/products">All</Link>
          </Button>
          {categories.map((item) => (
            <Button key={item} asChild variant={activeCategory === item ? "default" : "outline"} size="sm">
              <Link href={`/products?category=${encodeURIComponent(item)}`}>{item}</Link>
            </Button>
          ))}
        </div>
      </div>

      {visibleProducts.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center">
          <h2 className="text-xl font-semibold">No products found</h2>
          <p className="mt-2 text-muted-foreground">Try searching beer, rice, soft drinks, canned goods, or toiletries.</p>
          <Button asChild className="mt-5">
            <Link href="/products">Clear search</Link>
          </Button>
        </div>
      )}
    </main>
  );
}
