import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    {
      id: "/dashboard/admin",
      name: "Two Brothers Store Admin",
      short_name: "TB Admin",
      description: "Admin tools for store orders, utang, payments, products, and customers.",
      start_url: "/dashboard/admin",
      scope: "/",
      display: "standalone",
      orientation: "any",
      background_color: "#ffffff",
      theme_color: "#185d48",
      icons: [
        {
          src: "/circle_logo_no_border.png",
          sizes: "1024x1024",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/circle_logo_no_border.png",
          sizes: "1024x1024",
          type: "image/png",
          purpose: "maskable"
        }
      ]
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600"
      }
    }
  );
}
