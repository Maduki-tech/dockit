import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { api, HydrateClient } from '~/trpc/server';
import { AppNavbar } from '~/components/app-navbar';
import { Button } from '~/components/ui/button';

export default async function TasksPage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const user = await api.user.me();

    if (!user?.familyId) redirect('/onboarding');

    return (
        <HydrateClient>
            <div className="bg-background text-foreground min-h-screen">
                <AppNavbar />
                <main className="mx-auto max-w-5xl px-4 py-8">
                    <div className="flex items-center justify-between">
                        <h1 className="mb-1 text-2xl font-semibold">Tasks</h1>
                        <Button variant="outline" size="sm" className="mb-4">
                            + Create Task
                        </Button>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        Manage your family&apos;s tasks here.
                    </p>
                    <div className="mt-6 space-y-4">
                        {new Array(5).fill(0).map((_, i) => (
                            <TaskItem
                                key={i}
                                title={`Task ${i + 1}`}
                                assignedTo={`Assigned to User ${i + 1}`}
                            />
                        ))}
                    </div>
                </main>
            </div>
        </HydrateClient>
    );
}

type TaskItemProps = {
    title: string;
    assignedTo: string;
};

function TaskItem({ title, assignedTo }: TaskItemProps) {
    return (
        <div className="flex items-center justify-between rounded-md border p-4">
            <div>
                <h3 className="text-lg font-medium">{title}</h3>
                <p className="text-muted-foreground text-sm">{assignedTo}</p>
            </div>
            <Button variant="outline" size="sm">
                Mark as Done
            </Button>
        </div>
    );
}
