'use client';

import { api } from '~/trpc/react';
import { Button } from '~/components/ui/button';
import { toast } from 'sonner';
import { TaskStatus } from '../../generated/prisma';

export function TaskList() {
    const { data: tasks = [], isLoading } = api.task.list.useQuery();
    const utils = api.useUtils();

    const updateTask = api.task.update.useMutation({
        onSuccess: async () => {
            await utils.task.list.invalidate();
        },
        onError: (error) => {
            toast.error('Failed to update task: ' + error.message);
        },
    });

    if (isLoading) {
        return <p className="text-muted-foreground text-sm">Loading tasks…</p>;
    }

    if (tasks.length === 0) {
        return (
            <p className="text-muted-foreground text-sm">
                No tasks yet. Create one to get started!
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {tasks.map((task) => (
                <div
                    key={task.id}
                    className="flex items-center justify-between rounded-md border p-4"
                >
                    <div>
                        <h3
                            className={`text-lg font-medium ${task.status === TaskStatus.DONE ? 'text-muted-foreground line-through' : ''}`}
                        >
                            {task.name}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                            {task.user ? (task.user.name ?? 'Unknown') : 'Unassigned'}
                        </p>
                    </div>
                    <Button
                        variant={task.status === TaskStatus.DONE ? 'secondary' : 'outline'}
                        size="sm"
                        disabled={task.status === TaskStatus.DONE || updateTask.isPending}
                        onClick={() =>
                            updateTask.mutate({
                                id: task.id,
                                status: TaskStatus.DONE,
                            })
                        }
                    >
                        {task.status === TaskStatus.DONE ? 'Done' : 'Mark as Done'}
                    </Button>
                </div>
            ))}
        </div>
    );
}
