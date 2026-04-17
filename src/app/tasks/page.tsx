import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { api, HydrateClient } from '~/trpc/server';
import { AppNavbar } from '~/components/app-navbar';
import { CreateTaskDialog } from '~/components/create-task-dialog';
import { TasksView } from '~/components/tasks-view';

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
                <main className="mx-auto max-w-5xl px-4 py-8">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">
                                Tasks
                            </h1>
                            <p className="text-muted-foreground mt-0.5 text-sm">
                                Right-click any task for more options.
                            </p>
                        </div>
                        <CreateTaskDialog />
                    </div>
                    <TasksView />
                </main>
            </div>
        </HydrateClient>
    );
}
