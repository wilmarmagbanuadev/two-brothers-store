"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { PackageSearch, Search, Tags, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Category } from "@/lib/directus";
import { cn } from "@/lib/utils";

type ProductSearchProps = {
  categories?: Category[];
  className?: string;
  onSearch?: () => void;
};

export function ProductSearch({ categories = [], className, onSearch }: ProductSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => inputRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function openSearch() {
    setIsOpen(true);
  }

  function closeSearch() {
    setIsOpen(false);
  }

  function handleNavigate() {
    setIsOpen(false);
    onSearch?.();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      router.push("/products");
      closeSearch();
      onSearch?.();
      return;
    }

    router.push(`/products?q=${encodeURIComponent(trimmedQuery)}`);
    closeSearch();
    onSearch?.();
  }

  return (
    <div className={cn("hidden items-center lg:flex", className)}>
      <Button
        type="button"
        variant="outline"
        aria-label="Search products"
        onClick={openSearch}
        className="h-9 w-9 px-0 md:w-56 md:justify-start md:px-3 lg:w-64"
      >
        <Search className="h-4 w-4" />
        <span className="hidden flex-1 text-left font-normal text-muted-foreground md:inline">Search products...</span>
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline">
          Ctrl K
        </kbd>
      </Button>

      {isOpen && isMounted ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/75 p-4 backdrop-blur-sm sm:py-20" role="dialog" aria-modal="true" aria-label="Search products">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close search"
            onClick={closeSearch}
          />
          <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg border bg-background shadow-2xl sm:max-h-[calc(100dvh-10rem)]">
            <div className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
              <Search className="h-5 w-5 text-muted-foreground" />
              <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 items-center">
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="What are you searching for?"
                  className="h-10 border-0 px-0 text-base shadow-none focus-visible:ring-0"
                  aria-label="Search products"
                />
              </form>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Esc</kbd>
              <Button type="button" size="icon" variant="ghost" aria-label="Close search" onClick={closeSearch}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid min-h-0 flex-1 content-start gap-1 overflow-y-auto overscroll-contain p-3">
              <Link
                href={query.trim() ? `/products?q=${encodeURIComponent(query.trim())}` : "/products"}
                onClick={handleNavigate}
                className="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent"
              >
                <PackageSearch className="h-4 w-4 text-muted-foreground" />
                <span>{query.trim() ? `Search for "${query.trim()}"` : "Browse all products"}</span>
              </Link>

              {categories.slice(0, 6).map((category) => (
                <Link
                  key={category.slug}
                  href={`/products?category=${encodeURIComponent(category.slug)}`}
                  onClick={handleNavigate}
                  className="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent"
                >
                  <Tags className="h-4 w-4 text-muted-foreground" />
                  <span>{category.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
