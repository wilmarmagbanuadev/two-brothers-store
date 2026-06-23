import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, PackageCheck, ShieldCheck, ShoppingBasket, Sparkles, Truck } from "lucide-react";

import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { categories, products } from "@/lib/products";

const categoryImages: Record<string, string> = {
  Beer: "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=900&q=80",
  "Soft Drinks": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=900&q=80",
  "Chips & Curls": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=900&q=80",
  "Canned Goods": "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=900&q=80",
  Condiments: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=900&q=80",
  Rice: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80",
  Feeds: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=900&q=80",
  "Ice Cream": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=80",
  Toiletries: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80",
  Others: "https://images.unsplash.com/photo-1607328874071-45a9cd600644?auto=format&fit=crop&w=900&q=80"
};

const services = [
  {
    title: "Fresh Picks",
    text: "Cold drinks, snacks, rice, canned goods, sachets, and daily basics for nearby households.",
    icon: Sparkles
  },
  {
    title: "Fast Local Delivery",
    text: "A checkout flow ready for pickup, nearby delivery, and quick order summaries.",
    icon: Truck
  },
  {
    title: "Secure Shopping",
    text: "Cart state, account routes, and product pages are ready to extend as the store grows.",
    icon: ShieldCheck
  }
];

const steps = [
  "Choose sari-sari store goods and household basics",
  "Add products to your cart",
  "Review your order and checkout"
];

export default function LandingPage() {
  const featured = products.filter((product) => product.featured);

  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1800&q=80"
            alt="Fresh groceries on a market table"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
        </div>
        <div className="relative mx-auto flex min-h-[640px] max-w-7xl items-end px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <div className="max-w-2xl text-white">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em]">Neighborhood daily essentials</p>
            <h1 className="text-4xl font-bold tracking-normal sm:text-6xl">Two Brothers Store</h1>
            <p className="mt-5 text-lg text-white/85">
              Beer, soft drinks, curls, canned goods, condiments, rice, feeds, ice cream, toiletries, and small-store staples.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/products">
                  Shop Products
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/about">About Us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-secondary/45">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-3 lg:px-8">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium">Open daily for essentials</span>
          </div>
          <div className="flex items-center gap-3">
            <PackageCheck className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium">Sari-sari store categories</span>
          </div>
          <div className="flex items-center gap-3">
            <ShoppingBasket className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium">Cart and checkout ready</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-3xl font-bold tracking-normal">Shop By Category</h2>
          <p className="mt-2 text-muted-foreground">The menu is organized around the shopping trips customers make most often.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((category) => (
            <Link
              key={category}
              href={`/products?category=${encodeURIComponent(category)}`}
              className="group relative min-h-48 overflow-hidden rounded-lg"
            >
              <Image src={categoryImages[category]} alt={category} fill className="object-cover transition duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/35" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <h3 className="text-lg font-semibold">{category}</h3>
                <p className="mt-1 text-sm text-white/80">Browse items</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-muted/45">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div key={service.title} className="rounded-lg border bg-background p-6">
                <Icon className="h-8 w-8 text-primary" />
                <h2 className="mt-5 text-xl font-semibold">{service.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{service.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
        <div className="relative min-h-[420px] overflow-hidden rounded-lg">
          <Image
            src="https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80"
            alt="Store shelves with everyday products"
            fill
            className="object-cover"
          />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Sari-sari essentials</p>
          <h2 className="mt-3 text-3xl font-bold tracking-normal">Everything for a quick neighborhood purchase</h2>
          <p className="mt-4 text-muted-foreground">
            Build orders around cold drinks, snacks, canned goods, rice, condiments, toiletries, feeds, and other
            everyday items customers expect from a small sari-sari store.
          </p>
          <div className="mt-6 grid gap-3">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <span className="text-sm font-medium">{step}</span>
              </div>
            ))}
          </div>
          <Button asChild className="mt-8 w-fit">
            <Link href="/products">
              Start Shopping
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-normal">Featured Products</h2>
            <p className="mt-2 text-muted-foreground">Popular picks customers can add to cart quickly.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/products">View all</Link>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <h2 className="text-3xl font-bold tracking-normal">Ready to fill your cart?</h2>
            <p className="mt-2 max-w-2xl text-primary-foreground/80">
              Browse products, choose quantities, and continue through checkout from the same storefront flow.
            </p>
          </div>
          <Button asChild size="lg" variant="secondary">
            <Link href="/products">Shop Now</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
