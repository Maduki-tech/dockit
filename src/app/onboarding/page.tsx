import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { OnboardingClient } from "./_components/onboarding-client";

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) redirect("/sign-in");

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    select: { familyId: true },
  });

  if (user?.familyId) redirect("/");

  return <OnboardingClient />;
}
