import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { HydrateClient } from "~/trpc/server";
import { AppNavbar } from "~/components/app-navbar";
import { ThemeToggle } from "~/components/theme-toggle";

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    select: { familyId: true },
  });

  if (!user?.familyId) redirect("/onboarding");

  return (
    <HydrateClient>
      <div className="min-h-screen bg-background text-foreground">
        <AppNavbar />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="mb-1 text-2xl font-semibold">Settings</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Manage your account and family settings here.
          </p>

          <div className="space-y-6">
            <section>
              <h2 className="mb-1 text-base font-medium">Appearance</h2>
              <p className="mb-3 text-sm text-muted-foreground">
                Choose between light, dark, or system theme.
              </p>
              <ThemeToggle />
            </section>
          </div>
        </main>
      </div>
    </HydrateClient>
  );
}
