import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { api, HydrateClient } from '~/trpc/server';
import { AppNavbar } from '~/components/app-navbar';
import { TasksPageClient } from './_components/tasks-page-client';

export default async function TasksPage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const user = await api.user.me();

    if (!user?.familyId) redirect('/onboarding');

    void api.task.list.prefetch();

    return (
        <HydrateClient>
            <div className="bg-background text-foreground min-h-screen">
                <AppNavbar />
                <TasksPageClient />
            </div>
        </HydrateClient>
    );
}
