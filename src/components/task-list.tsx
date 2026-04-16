'use client';

import { api } from '~/trpc/react';
import { Button } from '~/components/ui/button';
import { toast } from 'sonner';
import { TaskStatus } from '../../generated/prisma';
import {
    ContextMenuTrigger,
    ContextMenu,
    ContextMenuContent,
    ContextMenuGroup,
    ContextMenuItem,
    ContextMenuSub,
    ContextMenuSubTrigger,
    ContextMenuSubContent,
} from './ui/context-menu';

export function TaskList() {
    const { data: tasks = [], isLoading } = api.task.list.useQuery();
    const { data: me } = api.user.me.useQuery();
    const { data: membersOfFamily } = api.family.getMembersOfFamily.useQuery(
        { familyId: me?.familyId ?? 0 },
        { enabled: !!me?.familyId },
    );

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

    function assignUser(taskId: string) {}

    return (
        <div className="space-y-4">
            {tasks.map((task) => (
                <ContextMenu key={task.id}>
                    <ContextMenuTrigger>
                        <div className="flex items-center justify-between rounded-md border p-4">
                            <div>
                                <h3
                                    className={`text-lg font-medium ${task.status === TaskStatus.DONE ? 'text-muted-foreground line-through' : ''}`}
                                >
                                    {task.name}
                                </h3>
                                <p className="text-muted-foreground text-sm">
                                    {task.user
                                        ? (task.user.name ?? 'Unknown')
                                        : 'Unassigned'}
                                </p>
                            </div>
                            <Button
                                variant={
                                    task.status === TaskStatus.DONE
                                        ? 'secondary'
                                        : 'outline'
                                }
                                size="sm"
                                disabled={
                                    task.status === TaskStatus.DONE ||
                                    updateTask.isPending
                                }
                                onClick={() =>
                                    updateTask.mutate({
                                        id: task.id,
                                        status: TaskStatus.DONE,
                                    })
                                }
                            >
                                {task.status === TaskStatus.DONE
                                    ? 'Done'
                                    : 'Mark as Done'}
                            </Button>
                        </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                        <ContextMenuGroup>
                            <ContextMenuSub>
                                <ContextMenuSubTrigger>
                                    Assign to...
                                </ContextMenuSubTrigger>
                                <ContextMenuSubContent>
                                    {membersOfFamily?.map((member) => (
                                        <ContextMenuItem
                                            key={member.id}
                                            onSelect={() =>
                                                updateTask.mutate({
                                                    id: task.id,
                                                    userId: member.id,
                                                })
                                            }
                                        >
                                            {member.name ?? 'Unknown'}
                                        </ContextMenuItem>
                                    ))}
                                </ContextMenuSubContent>
                            </ContextMenuSub>
                        </ContextMenuGroup>
                    </ContextMenuContent>
                </ContextMenu>
            ))}
        </div>
    );
}
