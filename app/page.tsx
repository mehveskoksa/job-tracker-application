import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect("/board");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
        Track your job search, all in one place
      </h1>
      <p className="mt-3 max-w-md text-zinc-500">
        Discover personalized job listings and manage every application on a
        simple kanban board.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/register"
          className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
