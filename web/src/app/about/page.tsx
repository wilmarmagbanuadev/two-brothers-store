import Image from "next/image";

export default function AboutPage() {
  return (
    <main>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="flex flex-col justify-center">
          <h1 className="text-4xl font-bold tracking-normal">About Us</h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Two Brothers Store is built around practical, everyday shopping: clear categories, dependable product pages,
            and a dashboard foundation for managing the business side.
          </p>
          <p className="mt-4 text-muted-foreground">
            This scaffold keeps the code compact while giving the storefront enough structure to grow into checkout,
            accounts, inventory tools, and admin workflows.
          </p>
        </div>
        <div className="relative min-h-[360px] overflow-hidden rounded-lg">
          <Image
            src="https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80"
            alt="Store aisle with stocked shelves"
            fill
            className="object-cover"
          />
        </div>
      </section>
    </main>
  );
}
