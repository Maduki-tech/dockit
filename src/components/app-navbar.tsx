"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";

const navLinks = [
  { href: "/tasks", label: "Tasks" },
  { href: "/members", label: "Members" },
  { href: "/settings", label: "Settings" },
];

export function AppNavbar() {
  const pathname = usePathname();
  const { data: user } = api.user.me.useQuery();

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <Link href="/" className="mr-2 flex flex-col leading-tight">
          <span className="text-base font-bold tracking-tight">Dockit</span>
          {user?.family && (
            <span className="text-xs text-muted-foreground">
              {user.family.name}
            </span>
          )}
        </Link>

        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto">
          <UserButton />
        </div>
      </div>
    </header>
  );
}
