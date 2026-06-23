import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/components/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProduct, products } from "@/lib/products";

type ProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export function generateStaticParams() {
  return products.map((product) => ({
    id: product.id
  }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = getProduct(id);

  if (!product) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" className="mb-6">
        <Link href="/products">Back to products</Link>
      </Button>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="relative min-h-[420px] overflow-hidden rounded-lg">
          <Image src={product.image} alt={product.name} fill priority className="object-cover" />
        </div>

        <Card>
          <CardHeader>
            <p className="text-sm font-medium text-primary">{product.category}</p>
            <CardTitle className="text-3xl">{product.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-lg text-muted-foreground">{product.description}</p>
            <div className="text-3xl font-bold">{product.price}</div>
            <AddToCartButton product={product} size="lg" className="w-full sm:w-auto" />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
