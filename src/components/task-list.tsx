'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
import { toast } from 'sonner';
import { TaskStatus } from '../../generated/prisma';
import { cn } from '~/lib/utils';
import { Check, MoreVertical, CalendarDays } from 'lucide-react';
import { Calendar } from '~/components/ui/calendar';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';

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
                colorClass
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
        { enabled: !!me?.familyId }
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
                        <div className="bg-muted h-5 w-5 animate-pulse rounded-full" />
                        <div className="bg-muted h-4 w-48 animate-pulse rounded" />
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
        const [datePickerOpen, setDatePickerOpen] = useState(false);
        const selectedDate = task.dueDate ? new Date(task.dueDate) : undefined;

        const taskMenuItems = (
            <>
                <DropdownMenuGroup>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            Assign to…
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            {membersOfFamily?.map((member) => (
                                <DropdownMenuItem
                                    key={member.id}
                                    onSelect={() =>
                                        updateTask.mutate({
                                            id: task.id,
                                            userId: member.id,
                                        })
                                    }
                                >
                                    {member.name ?? 'Unknown'}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuItem
                        onSelect={() => setDatePickerOpen(true)}
                        className="gap-2"
                    >
                        <CalendarDays className="h-4 w-4" />
                        Set due date
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </>
        );

        return (
            <>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div
                        className={cn(
                            'group flex cursor-default items-center gap-4 px-1 py-3',
                            !isLast && 'border-border/50 border-b'
                        )}
                    >
                        <button
                            className={cn(
                                'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150',
                                task.status === TaskStatus.DONE
                                    ? 'border-foreground bg-foreground'
                                    : 'border-muted-foreground/30 hover:border-foreground group-hover:border-muted-foreground/60'
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
                                    className="text-background h-3 w-3"
                                    strokeWidth={2.5}
                                />
                            )}
                        </button>

                        <span
                            className={cn(
                                'flex-1 text-sm leading-snug font-medium',
                                task.status === TaskStatus.DONE &&
                                    'text-muted-foreground line-through'
                            )}
                        >
                            {task.name}
                        </span>

                        {task.user ? (
                            <UserAvatar
                                name={task.user.name}
                                id={task.user.id}
                            />
                        ) : (
                            <div className="border-muted-foreground/20 h-7 w-7 flex-shrink-0 rounded-full border-2 border-dashed" />
                        )}

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="text-muted-foreground/40 hover:text-foreground flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {taskMenuItems}
                            </DropdownMenuContent>
                        </DropdownMenu>
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

                        <ContextMenuItem
                            onSelect={() => setDatePickerOpen(true)}
                            className="gap-2"
                        >
                            <CalendarDays className="h-4 w-4" />
                            Set due date
                        </ContextMenuItem>
                    </ContextMenuGroup>
                </ContextMenuContent>
            </ContextMenu>

            <Dialog open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <DialogContent className="w-auto p-4">
                    <DialogHeader>
                        <DialogTitle>Set due date</DialogTitle>
                    </DialogHeader>
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                            if (date) {
                                date.setHours(23, 59, 59, 0);
                                updateTask.mutate({
                                    id: task.id,
                                    dueDate: date.toISOString(),
                                });
                            } else {
                                updateTask.mutate({
                                    id: task.id,
                                    dueDate: null,
                                });
                            }
                            setDatePickerOpen(false);
                        }}
                        initialFocus
                    />
                    {task.dueDate && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive w-full"
                            onClick={() => {
                                updateTask.mutate({ id: task.id, dueDate: null });
                                setDatePickerOpen(false);
                            }}
                        >
                            Clear date
                        </Button>
                    )}
                </DialogContent>
            </Dialog>
            </>
        );
    }

    return (
        <div>
            {pending.length === 0 ? (
                <p className="text-muted-foreground px-1 py-3 text-sm">
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
                    <p className="text-muted-foreground/50 mb-2 px-1 text-xs font-medium tracking-wide uppercase">
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
