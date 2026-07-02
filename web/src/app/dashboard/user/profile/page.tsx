import { loadCustomerProfile } from "@/app/dashboard/user/profile/actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CustomerProfileForm } from "@/components/customer/customer-profile-form";

export default async function UserProfilePage() {
  const profile = await loadCustomerProfile();

  return (
    <main className="py-10">
      <Breadcrumbs items={[{ label: "Dashboard" }, { label: "Customer", href: "/dashboard/user" }, { label: "Profile" }]} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-normal">Profile</h1>
        <p className="mt-2 text-muted-foreground">View your customer account information.</p>
      </div>
      <CustomerProfileForm initialProfile={profile} />
    </main>
  );
}
