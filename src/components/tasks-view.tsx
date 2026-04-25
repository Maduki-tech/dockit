'use client';

import { useState, useMemo } from 'react';
import { api } from '~/trpc/react';
import { toast } from 'sonner';
import { TaskStatus, TaskPriority } from '../../generated/prisma';
import { cn } from '~/lib/utils';
import {
    Check,
    Search,
    ChevronDown,
    Circle,
    CircleDot,
    CircleCheck,
    Trash2,
    ArrowUpDown,
    User,
    Flag,
    MoreVertical,
    CalendarDays,
    Paperclip,
} from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Calendar } from '~/components/ui/calendar';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '~/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuGroup,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from '~/components/ui/dropdown-menu';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuGroup,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from '~/components/ui/context-menu';

// ─── Types ───────────────────────────────────────────────────────────────────

type Task = {
    id: number;
    name: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date | null;
    user: { id: number; name: string } | null;
    _count: { attachments: number };
};

type SortKey = 'default' | 'name' | 'dueDate' | 'priority' | 'assignee';

// ─── Constants ───────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
];

const STATUS_CONFIG: Record<
    TaskStatus,
    { label: string; color: string; nextStatus: TaskStatus }
> = {
    TODO: {
        label: 'Todo',
        color: 'text-muted-foreground',
        nextStatus: TaskStatus.IN_PROGRESS,
    },
    IN_PROGRESS: {
        label: 'In Progress',
        color: 'text-yellow-500',
        nextStatus: TaskStatus.DONE,
    },
    DONE: {
        label: 'Done',
        color: 'text-green-500',
        nextStatus: TaskStatus.TODO,
    },
};

const PRIORITY_CONFIG: Record<
    TaskPriority,
    { label: string; badgeClass: string; dotColor: string; sortOrder: number }
> = {
    HIGH: {
        label: 'High',
        badgeClass:
            'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-0',
        dotColor: 'bg-rose-500',
        sortOrder: 0,
    },
    MEDIUM: {
        label: 'Medium',
        badgeClass:
            'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0',
        dotColor: 'bg-blue-500',
        sortOrder: 1,
    },
    LOW: {
        label: 'Low',
        badgeClass: 'bg-muted text-muted-foreground border-0',
        dotColor: 'bg-muted-foreground/40',
        sortOrder: 2,
    },
};

const STATUS_ORDER: Record<TaskStatus, number> = {
    IN_PROGRESS: 0,
    TODO: 1,
    DONE: 2,
};

const SORT_LABELS: Record<SortKey, string> = {
    default: 'Default',
    name: 'Name',
    dueDate: 'Due date',
    priority: 'Priority',
    assignee: 'Assignee',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function UserAvatar({ name, id }: { name: string; id: number }) {
    const colorClass = AVATAR_COLORS[id % AVATAR_COLORS.length]!;
    const initials = name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
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

function StatusIcon({ status }: { status: TaskStatus }) {
    if (status === TaskStatus.DONE)
        return <CircleCheck className="h-4 w-4 text-green-500" />;
    if (status === TaskStatus.IN_PROGRESS)
        return <CircleDot className="h-4 w-4 text-yellow-500" />;
    return <Circle className="h-4 w-4 text-muted-foreground/40" />;
}

// ─── Main component ──────────────────────────────────────────────────────────

type TasksViewProps = {
    selectedTaskId: number | null;
    onSelectTask: (id: number | null) => void;
};

export function TasksView({ selectedTaskId, onSelectTask }: TasksViewProps) {
    const { data: tasks = [], isLoading } = api.task.list.useQuery();
    const { data: me } = api.user.me.useQuery();
    const { data: members = [] } = api.family.getMembersOfFamily.useQuery(
        { familyId: me?.familyId ?? 0 },
        { enabled: !!me?.familyId }
    );

    const utils = api.useUtils();

    const updateTask = api.task.update.useMutation({
        onSuccess: () => utils.task.list.invalidate(),
        onError: (err) => toast.error('Failed to update: ' + err.message),
    });

    const deleteTask = api.task.delete.useMutation({
        onSuccess: () => {
            void utils.task.list.invalidate();
            toast.success('Task deleted');
        },
        onError: (err) => toast.error('Failed to delete: ' + err.message),
    });

    // ── Filter state ──────────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<Set<TaskStatus>>(
        new Set()
    );
    const [priorityFilter, setPriorityFilter] = useState<Set<TaskPriority>>(
        new Set()
    );
    const [assigneeFilter, setAssigneeFilter] = useState<Set<number | null>>(
        new Set()
    );
    const [sortKey, setSortKey] = useState<SortKey>('default');

    // ── Derived data ──────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        let result = tasks as Task[];

        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter((t) => t.name.toLowerCase().includes(q));
        }
        if (statusFilter.size > 0) {
            result = result.filter((t) => statusFilter.has(t.status));
        }
        if (priorityFilter.size > 0) {
            result = result.filter((t) => priorityFilter.has(t.priority));
        }
        if (assigneeFilter.size > 0) {
            result = result.filter((t) => assigneeFilter.has(t.user?.id ?? null));
        }

        result = [...result].sort((a, b) => {
            switch (sortKey) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'dueDate': {
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return (
                        new Date(a.dueDate).getTime() -
                        new Date(b.dueDate).getTime()
                    );
                }
                case 'priority':
                    return (
                        PRIORITY_CONFIG[a.priority].sortOrder -
                        PRIORITY_CONFIG[b.priority].sortOrder
                    );
                case 'assignee': {
                    const aName = a.user?.name ?? 'zzz';
                    const bName = b.user?.name ?? 'zzz';
                    return aName.localeCompare(bName);
                }
                default:
                    return (
                        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
                        PRIORITY_CONFIG[a.priority].sortOrder - PRIORITY_CONFIG[b.priority].sortOrder
                    );
            }
        });

        return result;
    }, [tasks, search, statusFilter, priorityFilter, assigneeFilter, sortKey]);

    const grouped = useMemo(() => {
        if (sortKey !== 'default') return null;
        return {
            inProgress: filtered.filter(
                (t) => t.status === TaskStatus.IN_PROGRESS
            ),
            todo: filtered.filter((t) => t.status === TaskStatus.TODO),
            done: filtered.filter((t) => t.status === TaskStatus.DONE),
        };
    }, [filtered, sortKey]);

    const hasFilters =
        search.trim() ||
        statusFilter.size > 0 ||
        priorityFilter.size > 0 ||
        assigneeFilter.size > 0;

    function clearFilters() {
        setSearch('');
        setStatusFilter(new Set());
        setPriorityFilter(new Set());
        setAssigneeFilter(new Set());
    }

    function toggleStatus(s: TaskStatus) {
        setStatusFilter((prev) => {
            const next = new Set(prev);
            if (next.has(s)) { next.delete(s); } else { next.add(s); }
            return next;
        });
    }

    function togglePriority(p: TaskPriority) {
        setPriorityFilter((prev) => {
            const next = new Set(prev);
            if (next.has(p)) { next.delete(p); } else { next.add(p); }
            return next;
        });
    }

    function toggleAssignee(id: number | null) {
        setAssigneeFilter((prev) => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); } else { next.add(id); }
            return next;
        });
    }

    // ── Row ───────────────────────────────────────────────────────────────
    function TaskRow({ task }: { task: Task }) {
        const isSelected = task.id === selectedTaskId;
        const [datePickerOpen, setDatePickerOpen] = useState(false);
        const selectedDate = task.dueDate ? new Date(task.dueDate) : undefined;
        const isOverdue =
            task.dueDate &&
            new Date(task.dueDate) < new Date() &&
            task.status !== TaskStatus.DONE;

        return (
            <>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div
                        className={cn(
                            'group border-border/50 flex cursor-pointer items-center gap-3 border-b px-2 py-3 last:border-0 transition-colors',
                            isSelected ? 'bg-muted/60' : 'hover:bg-muted/30'
                        )}
                        onClick={() => onSelectTask(isSelected ? null : task.id)}
                    >
                        {/* Status toggle */}
                        <button
                            className="flex-shrink-0 transition-transform hover:scale-110"
                            onClick={(e) => {
                                e.stopPropagation();
                                updateTask.mutate({
                                    id: task.id,
                                    status: STATUS_CONFIG[task.status].nextStatus,
                                });
                            }}
                            disabled={updateTask.isPending}
                            title={`Mark as ${STATUS_CONFIG[STATUS_CONFIG[task.status].nextStatus].label}`}
                        >
                            <StatusIcon status={task.status} />
                        </button>

                        {/* Name */}
                        <span
                            className={cn(
                                'flex-1 text-sm font-medium leading-snug',
                                task.status === TaskStatus.DONE &&
                                    'text-muted-foreground line-through'
                            )}
                        >
                            {task.name}
                        </span>

                        {/* Meta row */}
                        <div className="flex items-center gap-2">
                            {task.dueDate && (
                                <span
                                    className={cn(
                                        'text-xs',
                                        isOverdue
                                            ? 'font-semibold text-rose-500'
                                            : 'text-muted-foreground'
                                    )}
                                >
                                    {isOverdue ? '⚠ ' : ''}
                                    {new Date(task.dueDate).toLocaleDateString(
                                        'en-US',
                                        {
                                            month: 'short',
                                            day: 'numeric',
                                        }
                                    )}
                                </span>
                            )}

                            <Badge
                                className={cn(
                                    'h-5 px-1.5 text-xs',
                                    PRIORITY_CONFIG[task.priority].badgeClass
                                )}
                            >
                                {PRIORITY_CONFIG[task.priority].label}
                            </Badge>

                            {task._count.attachments > 0 && (
                                <span className="text-muted-foreground flex items-center gap-0.5 text-xs">
                                    <Paperclip className="h-3 w-3" />
                                    {task._count.attachments}
                                </span>
                            )}

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        className="rounded-full transition-opacity hover:opacity-75"
                                        onClick={(e) => e.stopPropagation()}
                                        title={task.user ? task.user.name : 'Assign…'}
                                    >
                                        {task.user ? (
                                            <UserAvatar
                                                name={task.user.name}
                                                id={task.user.id}
                                            />
                                        ) : (
                                            <div className="border-muted-foreground/20 hover:border-muted-foreground/50 h-7 w-7 flex-shrink-0 rounded-full border-2 border-dashed transition-colors" />
                                        )}
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Assign to</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onSelect={() => updateTask.mutate({ id: task.id, userId: null })}
                                        className="gap-2"
                                    >
                                        <div className="border-muted-foreground/30 h-5 w-5 rounded-full border-2 border-dashed" />
                                        Unassigned
                                        {!task.user && <Check className="ml-auto h-3.5 w-3.5" />}
                                    </DropdownMenuItem>
                                    {members.map((member) => (
                                        <DropdownMenuItem
                                            key={member.id}
                                            onSelect={() => updateTask.mutate({ id: task.id, userId: member.id })}
                                            className="gap-2"
                                        >
                                            <UserAvatar name={member.name} id={member.id} />
                                            {member.name}
                                            {task.user?.id === member.id && <Check className="ml-auto h-3.5 w-3.5" />}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Three-dot menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="text-muted-foreground/40 hover:text-foreground flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuGroup>
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <CircleDot className="mr-2 h-4 w-4" />
                                            Set status
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                            {Object.values(TaskStatus).map((s) => (
                                                <DropdownMenuItem
                                                    key={s}
                                                    onSelect={() =>
                                                        updateTask.mutate({
                                                            id: task.id,
                                                            status: s,
                                                        })
                                                    }
                                                    className="gap-2"
                                                >
                                                    <StatusIcon status={s} />
                                                    {STATUS_CONFIG[s].label}
                                                    {task.status === s && (
                                                        <Check className="ml-auto h-3.5 w-3.5" />
                                                    )}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <Flag className="mr-2 h-4 w-4" />
                                            Set priority
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                            {Object.values(TaskPriority).map((p) => (
                                                <DropdownMenuItem
                                                    key={p}
                                                    onSelect={() =>
                                                        updateTask.mutate({
                                                            id: task.id,
                                                            priority: p,
                                                        })
                                                    }
                                                    className="gap-2"
                                                >
                                                    <span
                                                        className={cn(
                                                            'h-2 w-2 flex-shrink-0 rounded-full',
                                                            PRIORITY_CONFIG[p].dotColor
                                                        )}
                                                    />
                                                    {PRIORITY_CONFIG[p].label}
                                                    {task.priority === p && (
                                                        <Check className="ml-auto h-3.5 w-3.5" />
                                                    )}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <User className="mr-2 h-4 w-4" />
                                            Assign to…
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                            <DropdownMenuItem
                                                onSelect={() =>
                                                    updateTask.mutate({
                                                        id: task.id,
                                                        userId: null,
                                                    })
                                                }
                                            >
                                                Unassigned
                                                {!task.user && (
                                                    <Check className="ml-auto h-3.5 w-3.5" />
                                                )}
                                            </DropdownMenuItem>
                                            {members.map((member) => (
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
                                                    {task.user?.id === member.id && (
                                                        <Check className="ml-auto h-3.5 w-3.5" />
                                                    )}
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

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive gap-2"
                                    onSelect={() => deleteTask.mutate({ id: task.id })}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete task
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </ContextMenuTrigger>

                <ContextMenuContent className="w-52">
                    <ContextMenuGroup>
                        <ContextMenuSub>
                            <ContextMenuSubTrigger>
                                <CircleDot className="mr-2 h-4 w-4" />
                                Set status
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent>
                                {Object.values(TaskStatus).map((s) => (
                                    <ContextMenuItem
                                        key={s}
                                        onSelect={() =>
                                            updateTask.mutate({
                                                id: task.id,
                                                status: s,
                                            })
                                        }
                                        className="gap-2"
                                    >
                                        <StatusIcon status={s} />
                                        {STATUS_CONFIG[s].label}
                                        {task.status === s && (
                                            <Check className="ml-auto h-3.5 w-3.5" />
                                        )}
                                    </ContextMenuItem>
                                ))}
                            </ContextMenuSubContent>
                        </ContextMenuSub>

                        <ContextMenuSub>
                            <ContextMenuSubTrigger>
                                <Flag className="mr-2 h-4 w-4" />
                                Set priority
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent>
                                {Object.values(TaskPriority).map((p) => (
                                    <ContextMenuItem
                                        key={p}
                                        onSelect={() =>
                                            updateTask.mutate({
                                                id: task.id,
                                                priority: p,
                                            })
                                        }
                                        className="gap-2"
                                    >
                                        <span
                                            className={cn(
                                                'h-2 w-2 flex-shrink-0 rounded-full',
                                                PRIORITY_CONFIG[p].dotColor
                                            )}
                                        />
                                        {PRIORITY_CONFIG[p].label}
                                        {task.priority === p && (
                                            <Check className="ml-auto h-3.5 w-3.5" />
                                        )}
                                    </ContextMenuItem>
                                ))}
                            </ContextMenuSubContent>
                        </ContextMenuSub>

                        <ContextMenuSub>
                            <ContextMenuSubTrigger>
                                <User className="mr-2 h-4 w-4" />
                                Assign to…
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent>
                                <ContextMenuItem
                                    onSelect={() =>
                                        updateTask.mutate({
                                            id: task.id,
                                            userId: null,
                                        })
                                    }
                                >
                                    Unassigned
                                    {!task.user && (
                                        <Check className="ml-auto h-3.5 w-3.5" />
                                    )}
                                </ContextMenuItem>
                                {members.map((member) => (
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
                                        {task.user?.id === member.id && (
                                            <Check className="ml-auto h-3.5 w-3.5" />
                                        )}
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

                    <ContextMenuSeparator />

                    <ContextMenuItem
                        className="text-destructive focus:text-destructive gap-2"
                        onSelect={() => deleteTask.mutate({ id: task.id })}
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete task
                    </ContextMenuItem>
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

    // ── Group section ─────────────────────────────────────────────────────
    function GroupSection({
        label,
        tasks: groupTasks,
        defaultOpen = true,
    }: {
        label: string;
        tasks: Task[];
        defaultOpen?: boolean;
    }) {
        const [open, setOpen] = useState(defaultOpen);
        if (groupTasks.length === 0) return null;
        return (
            <div className="mb-1">
                <button
                    className="text-muted-foreground hover:text-foreground mb-1 flex w-full items-center gap-2 px-2 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors"
                    onClick={() => setOpen((v) => !v)}
                >
                    <ChevronDown
                        className={cn(
                            'h-3.5 w-3.5 transition-transform',
                            !open && '-rotate-90'
                        )}
                    />
                    {label}
                    <span className="text-muted-foreground/60 font-normal normal-case tracking-normal">
                        {groupTasks.length}
                    </span>
                </button>
                {open && (
                    <div className="rounded-md border">
                        {groupTasks.map((task) => (
                            <TaskRow key={task.id} task={task} />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="space-y-2 pt-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-3">
                        <div className="bg-muted h-5 w-5 animate-pulse rounded-full" />
                        <div className="bg-muted h-4 w-56 animate-pulse rounded" />
                        <div className="bg-muted ml-auto h-4 w-16 animate-pulse rounded" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div>
            {/* ── Filter toolbar ── */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-48">
                    <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
                    <Input
                        placeholder="Search tasks…"
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Status filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                'gap-1.5',
                                statusFilter.size > 0 &&
                                    'border-primary text-primary'
                            )}
                        >
                            <CircleDot className="h-3.5 w-3.5" />
                            Status
                            {statusFilter.size > 0 && (
                                <span className="bg-primary text-primary-foreground flex h-4 w-4 items-center justify-center rounded-full text-[10px]">
                                    {statusFilter.size}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {Object.values(TaskStatus).map((s) => (
                            <DropdownMenuCheckboxItem
                                key={s}
                                checked={statusFilter.has(s)}
                                onCheckedChange={() => toggleStatus(s)}
                            >
                                <StatusIcon status={s} />
                                <span className="ml-2">
                                    {STATUS_CONFIG[s].label}
                                </span>
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Priority filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                'gap-1.5',
                                priorityFilter.size > 0 &&
                                    'border-primary text-primary'
                            )}
                        >
                            <Flag className="h-3.5 w-3.5" />
                            Priority
                            {priorityFilter.size > 0 && (
                                <span className="bg-primary text-primary-foreground flex h-4 w-4 items-center justify-center rounded-full text-[10px]">
                                    {priorityFilter.size}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuLabel>
                            Filter by priority
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {Object.values(TaskPriority).map((p) => (
                            <DropdownMenuCheckboxItem
                                key={p}
                                checked={priorityFilter.has(p)}
                                onCheckedChange={() => togglePriority(p)}
                            >
                                <span
                                    className={cn(
                                        'mr-2 h-2 w-2 rounded-full',
                                        PRIORITY_CONFIG[p].dotColor
                                    )}
                                />
                                {PRIORITY_CONFIG[p].label}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Assignee filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                'gap-1.5',
                                assigneeFilter.size > 0 &&
                                    'border-primary text-primary'
                            )}
                        >
                            <User className="h-3.5 w-3.5" />
                            Assignee
                            {assigneeFilter.size > 0 && (
                                <span className="bg-primary text-primary-foreground flex h-4 w-4 items-center justify-center rounded-full text-[10px]">
                                    {assigneeFilter.size}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuLabel>
                            Filter by assignee
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                            checked={assigneeFilter.has(null)}
                            onCheckedChange={() => toggleAssignee(null)}
                        >
                            <div className="border-muted-foreground/30 mr-2 h-5 w-5 rounded-full border-2 border-dashed" />
                            Unassigned
                        </DropdownMenuCheckboxItem>
                        {members.map((m) => (
                            <DropdownMenuCheckboxItem
                                key={m.id}
                                checked={assigneeFilter.has(m.id)}
                                onCheckedChange={() => toggleAssignee(m.id)}
                            >
                                <UserAvatar name={m.name} id={m.id} />
                                <span className="ml-2">{m.name}</span>
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Sort */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                'gap-1.5',
                                sortKey !== 'default' &&
                                    'border-primary text-primary'
                            )}
                        >
                            <ArrowUpDown className="h-3.5 w-3.5" />
                            {sortKey !== 'default'
                                ? SORT_LABELS[sortKey]
                                : 'Sort'}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                            <DropdownMenuItem
                                key={k}
                                onSelect={() => setSortKey(k)}
                                className="gap-2"
                            >
                                {SORT_LABELS[k]}
                                {sortKey === k && (
                                    <Check className="ml-auto h-3.5 w-3.5" />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {hasFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={clearFilters}
                    >
                        Clear
                    </Button>
                )}
            </div>

            {/* ── Task list ── */}
            {filtered.length === 0 ? (
                <div className="py-16 text-center">
                    <p className="text-muted-foreground text-sm">
                        {hasFilters
                            ? 'No tasks match your filters.'
                            : 'No tasks yet. Create one to get started.'}
                    </p>
                    {hasFilters && (
                        <button
                            className="text-muted-foreground/60 hover:text-muted-foreground mt-1 text-xs underline-offset-2 hover:underline"
                            onClick={clearFilters}
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            ) : grouped ? (
                <>
                    <GroupSection
                        label="In Progress"
                        tasks={grouped.inProgress}
                        defaultOpen
                    />
                    <GroupSection
                        label="Todo"
                        tasks={grouped.todo}
                        defaultOpen
                    />
                    <GroupSection
                        label="Done"
                        tasks={grouped.done}
                        defaultOpen={false}
                    />
                </>
            ) : (
                <div className="rounded-md border">
                    {filtered.map((task) => (
                        <TaskRow key={task.id} task={task} />
                    ))}
                </div>
            )}

            {/* ── Footer count ── */}
            {filtered.length > 0 && (
                <p className="text-muted-foreground/50 mt-4 px-1 text-xs">
                    {filtered.length} task{filtered.length !== 1 ? 's' : ''}
                    {hasFilters ? ' matched' : ' total'}
                </p>
            )}
        </div>
    );
}
