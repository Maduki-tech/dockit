'use client';

import { api } from '~/trpc/react';
import { toast } from 'sonner';
import { TaskStatus } from '../../generated/prisma';
import { cn } from '~/lib/utils';
import { Check } from 'lucide-react';
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

const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700',
    'bg-violet-100 text-violet-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
];

function UserAvatar({ name, id }: { name: string | null; id: number }) {
    const colorClass = AVATAR_COLORS[id % AVATAR_COLORS.length]!;
    const initials = name
        ? name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()
        : '?';
    return (
        <div
            className={cn(
                'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                colorClass,
            )}
        >
            {initials}
        </div>
    );
}

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
        return (
            <div className="space-y-1">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 py-3">
                        <div className="h-5 w-5 animate-pulse rounded-full bg-muted" />
                        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                    </div>
                ))}
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div className="py-12 text-center">
                <p className="text-muted-foreground text-sm">No tasks yet.</p>
                <p className="text-muted-foreground/60 mt-1 text-xs">
                    Create one to get started.
                </p>
            </div>
        );
    }

    const pending = tasks.filter((t) => t.status !== TaskStatus.DONE);
    const done = tasks.filter((t) => t.status === TaskStatus.DONE);

    function TaskRow({
        task,
        isLast,
    }: {
        task: (typeof tasks)[number];
        isLast: boolean;
    }) {
        return (
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div
                        className={cn(
                            'group flex cursor-default items-center gap-4 px-1 py-3',
                            !isLast && 'border-b border-border/50',
                        )}
                    >
                        <button
                            className={cn(
                                'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150',
                                task.status === TaskStatus.DONE
                                    ? 'border-foreground bg-foreground'
                                    : 'border-muted-foreground/30 hover:border-foreground group-hover:border-muted-foreground/60',
                            )}
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
                            {task.status === TaskStatus.DONE && (
                                <Check
                                    className="h-3 w-3 text-background"
                                    strokeWidth={2.5}
                                />
                            )}
                        </button>

                        <span
                            className={cn(
                                'flex-1 text-sm font-medium leading-snug',
                                task.status === TaskStatus.DONE &&
                                    'text-muted-foreground line-through',
                            )}
                        >
                            {task.name}
                        </span>

                        {task.user ? (
                            <UserAvatar name={task.user.name} id={task.user.id} />
                        ) : (
                            <div className="h-7 w-7 flex-shrink-0 rounded-full border-2 border-dashed border-muted-foreground/20" />
                        )}
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuGroup>
                        <ContextMenuSub>
                            <ContextMenuSubTrigger>
                                Assign to…
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
        );
    }

    return (
        <div>
            {pending.length === 0 ? (
                <p className="px-1 py-3 text-sm text-muted-foreground">
                    All tasks are done!
                </p>
            ) : (
                pending.map((task, i) => (
                    <TaskRow
                        key={task.id}
                        task={task}
                        isLast={i === pending.length - 1}
                    />
                ))
            )}

            {done.length > 0 && (
                <div className="mt-8">
                    <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground/50">
                        Completed · {done.length}
                    </p>
                    <div className="opacity-50">
                        {done.map((task, i) => (
                            <TaskRow
                                key={task.id}
                                task={task}
                                isLast={i === done.length - 1}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
