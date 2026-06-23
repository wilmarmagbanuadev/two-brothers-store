import Image from "next/image";
import Link from "next/link";

import { AddToCartButton } from "@/components/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="overflow-hidden">
      <div className="relative h-52 w-full">
        <Image src={product.image} alt={product.name} fill className="object-cover" sizes="(min-width: 1024px) 33vw, 100vw" />
      </div>
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
        <CardDescription>{product.category}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{product.description}</p>
        <div className="flex items-center justify-between">
          <span className="font-semibold">{product.price}</span>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/products/${product.id}`}>View</Link>
            </Button>
            <AddToCartButton product={product} size="sm" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
