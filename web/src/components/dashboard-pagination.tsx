import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardPaginationProps = {
  path: string;
  page: number;
  totalPages: number;
  pageParam?: string;
  query?: Record<string, string | number | undefined>;
};

function pageHref(
  path: string,
  page: number,
  pageParam: string,
  query: DashboardPaginationProps["query"]
) {
  const params = new URLSearchParams();

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });
  params.set(pageParam, String(page));

  return `${path}?${params.toString()}`;
}

export function DashboardPagination({
  path,
  page,
  totalPages,
  pageParam = "page",
  query
}: DashboardPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-sm">
      <Link
        href={pageHref(path, Math.max(1, page - 1), pageParam, query)}
        aria-label="Previous page"
        aria-disabled={page <= 1}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          page <= 1 && "pointer-events-none opacity-50"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="min-w-20 text-center">
        {page} / {totalPages}
      </span>
      <Link
        href={pageHref(path, Math.min(totalPages, page + 1), pageParam, query)}
        aria-label="Next page"
        aria-disabled={page >= totalPages}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          page >= totalPages && "pointer-events-none opacity-50"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
