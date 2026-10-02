"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const navLinks = [
  { href: "/board", label: "Board" },
  { href: "/search", label: "Job Search" },
  { href: "/profile", label: "Profile" },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-900">
          JobTracker
        </Link>

        {status === "authenticated" && (
          <nav className="flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="ml-2 rounded-md px-3 py-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900"
            >
              Sign out
            </button>
          </nav>
        )}

        {status === "unauthenticated" && (
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Sign up
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
