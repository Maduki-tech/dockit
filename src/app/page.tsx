import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '~/server/db';
import { HydrateClient } from '~/trpc/server';
import { AppNavbar } from '~/components/app-navbar';
import { Dashboard } from './_components/dashboard';

export default async function Home() {
    const { userId } = await auth();

    if (!userId) redirect('/sign-in');

    const user = await db.user.findUnique({
        where: { clerkId: userId },
        include: { family: true },
    });

    if (!user?.familyId) redirect('/onboarding');

    return (
        <HydrateClient>
            <div className="min-h-screen bg-background text-foreground">
                <AppNavbar />
                <Dashboard userName={user.name} />
            </div>
        </HydrateClient>
    );
}
