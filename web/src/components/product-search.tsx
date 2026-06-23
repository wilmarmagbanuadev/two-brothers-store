"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProductSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      router.push("/products");
      return;
    }

    router.push(`/products?q=${encodeURIComponent(trimmedQuery)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="hidden min-w-64 items-center gap-2 lg:flex">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search products"
        className="h-9"
        aria-label="Search products"
      />
      <Button type="submit" size="icon" variant="outline" aria-label="Search">
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}
