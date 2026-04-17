import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { HydrateClient, api } from "~/trpc/server";
import { AppNavbar } from "~/components/app-navbar";
import { MembersClient } from "./_components/members-client";

export default async function MembersPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    select: { familyId: true },
  });

  if (!user?.familyId) redirect("/onboarding");

  void api.family.getMyFamily.prefetch();

  return (
    <HydrateClient>
      <div className="min-h-screen bg-background text-foreground">
        <AppNavbar />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-6">
            <h1 className="mb-1 text-2xl font-semibold">Members</h1>
            <p className="text-sm text-muted-foreground">
              See who&apos;s in your family and invite new members.
            </p>
          </div>
          <MembersClient currentClerkId={userId} />
        </main>
      </div>
    </HydrateClient>
  );
}
