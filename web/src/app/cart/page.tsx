import { redirect } from "next/navigation";

import { CartPageClient } from "@/components/cart-page-client";
import { getCurrentDirectusRole } from "@/lib/current-user";

export default async function CartPage() {
  const currentRole = await getCurrentDirectusRole();

  if (currentRole !== "Customer") {
    redirect("/sign-in/user");
  }

  return <CartPageClient />;
}
