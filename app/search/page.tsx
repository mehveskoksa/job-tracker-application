import { redirect } from "next/navigation";
import { auth } from "@/auth";
import JobSearch from "@/components/job-search";

export default async function JobsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">Find jobs</h1>
      <p className="mt-1 mb-6 text-sm text-gray-600">
        Listings ranked by how well they match your profile. Track the ones you
        want to follow.
      </p>
      <JobSearch />
    </main>
  );
}
