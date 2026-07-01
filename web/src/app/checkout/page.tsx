import { redirect } from "next/navigation";

import { CheckoutPageClient } from "@/components/checkout-page-client";
import { getCurrentDirectusRole } from "@/lib/current-user";

export default async function CheckoutPage() {
  const currentRole = await getCurrentDirectusRole();

  if (currentRole !== "Customer") {
    redirect("/sign-in/user");
  }

  return <CheckoutPageClient />;
}
