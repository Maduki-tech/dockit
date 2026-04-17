import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { HydrateClient, api } from "~/trpc/server";
import { AppNavbar } from "~/components/app-navbar";
import { SettingsClient } from "./_components/settings-client";

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    select: { familyId: true },
  });

  if (!user?.familyId) redirect("/onboarding");

  void api.user.me.prefetch();
  void api.family.getMyFamily.prefetch();

  return (
    <HydrateClient>
      <div className="min-h-screen bg-background text-foreground">
        <AppNavbar />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-8">
            <h1 className="mb-1 text-2xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your account and family settings.
            </p>
          </div>
          <SettingsClient />
        </main>
      </div>
    </HydrateClient>
  );
}
