import { redirect } from "next/navigation";

import { CustomerSidebar } from "@/components/customer/customer-sidebar";
import { getCurrentDirectusRole } from "@/lib/current-user";

export default async function UserDashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const currentRole = await getCurrentDirectusRole();

  if (currentRole !== "Customer") {
    redirect("/sign-in/user");
  }

  return (
    <div className="mx-auto flex max-w-[1500px] gap-6 px-4 sm:px-6 lg:px-8">
      <CustomerSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
