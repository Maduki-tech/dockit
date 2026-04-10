import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { HydrateClient } from "~/trpc/server";
import { AppNavbar } from "~/components/app-navbar";

export default async function MembersPage() {
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
          <h1 className="mb-1 text-2xl font-semibold">Members</h1>
          <p className="text-sm text-muted-foreground">
            See and manage your family members here.
          </p>
        </main>
      </div>
    </HydrateClient>
  );
}
