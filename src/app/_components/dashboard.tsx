'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { CreateTaskDialog } from '~/components/create-task-dialog';
import { TaskPriority, TaskStatus } from '../../../generated/prisma';
import { cn } from '~/lib/utils';
import {
    AlertCircle, CheckCircle2, Clock, ListTodo,
    MoreVertical, CircleDot, Flag, User, CalendarDays, Trash2, Check,
    Circle, CircleCheck,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Calendar } from '~/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub,
    DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import {
    ContextMenu, ContextMenuContent, ContextMenuGroup, ContextMenuItem,
    ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent,
    ContextMenuSubTrigger, ContextMenuTrigger,
} from '~/components/ui/context-menu';
import { toast } from 'sonner';

type Props = {
    userName: string;
};

function startOfWeek(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d;
}

function endOfWeek(): Date {
    const d = startOfWeek();
    d.setDate(d.getDate() + 7);
    return d;
}

const PRIORITY_LABEL: Record<TaskPriority, string> = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
};

const PRIORITY_COLOR: Record<TaskPriority, string> = {
    LOW: 'text-muted-foreground bg-muted',
    MEDIUM: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40',
    HIGH: 'text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-900/40',
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; nextStatus: TaskStatus }> = {
    TODO: { label: 'Todo', nextStatus: TaskStatus.IN_PROGRESS },
    IN_PROGRESS: { label: 'In Progress', nextStatus: TaskStatus.DONE },
    DONE: { label: 'Done', nextStatus: TaskStatus.TODO },
};

function StatusIcon({ status }: { status: TaskStatus }) {
    if (status === TaskStatus.DONE) return <CircleCheck className="h-4 w-4 text-green-500" />;
    if (status === TaskStatus.IN_PROGRESS) return <CircleDot className="h-4 w-4 text-yellow-500" />;
    return <Circle className="h-4 w-4 text-muted-foreground/40" />;
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
    return (
        <span
            className={cn(
                'rounded px-1.5 py-0.5 text-xs font-medium',
                PRIORITY_COLOR[priority]
            )}
        >
            {PRIORITY_LABEL[priority]}
        </span>
    );
}

const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
];

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
                'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                colorClass
            )}
            title={name}
        >
            {initials}
        </div>
    );
}

type SpotlightTask = {
    id: number;
    name: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date | null;
    user: { name: string; id: number } | null;
};

function TaskRow({ task }: { task: SpotlightTask }) {
    const isOverdue =
        task.dueDate && new Date(task.dueDate) < new Date() && task.status !== TaskStatus.DONE;

    return (
        <div className="flex items-center gap-3 py-2.5">
            <div
                className={cn(
                    'h-2 w-2 flex-shrink-0 rounded-full',
                    task.status === TaskStatus.DONE
                        ? 'bg-green-500'
                        : task.status === TaskStatus.IN_PROGRESS
                          ? 'bg-yellow-500'
                          : 'bg-muted-foreground/30'
                )}
            />
            <span className="flex-1 text-sm font-medium leading-snug">
                {task.name}
            </span>
            <div className="flex items-center gap-2">
                {task.dueDate && (
                    <span
                        className={cn(
                            'text-xs',
                            isOverdue
                                ? 'font-medium text-rose-600'
                                : 'text-muted-foreground'
                        )}
                    >
                        {new Date(task.dueDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                        })}
                    </span>
                )}
                <PriorityBadge priority={task.priority} />
                {task.user && (
                    <UserAvatar name={task.user.name} id={task.user.id} />
                )}
            </div>
        </div>
    );
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDays(): Date[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

function isSameDay(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

type Member = { id: number; name: string };
type UpdateTask = ReturnType<typeof api.task.update.useMutation>;
type DeleteTask = ReturnType<typeof api.task.delete.useMutation>;

function PlannerTaskCard({
    task,
    members,
    updateTask,
    deleteTask,
}: {
    task: SpotlightTask;
    members: Member[];
    updateTask: UpdateTask;
    deleteTask: DeleteTask;
}) {
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue =
        task.dueDate &&
        new Date(task.dueDate) < today &&
        task.status !== TaskStatus.DONE;

    const cardContent = (
        <div
            className={cn(
                'rounded-md border px-2 py-1.5',
                task.status === TaskStatus.DONE
                    ? 'bg-muted/30 border-border/30'
                    : isOverdue
                      ? 'border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/20'
                      : 'bg-card border-border'
            )}
        >
            {/* Status + name + 3-dot */}
            <div className="flex items-start gap-1">
                <button
                    className="mt-[3px] flex-shrink-0 transition-transform hover:scale-110"
                    onClick={() =>
                        updateTask.mutate({
                            id: task.id,
                            status: STATUS_CONFIG[task.status].nextStatus,
                        })
                    }
                    disabled={updateTask.isPending}
                >
                    <div
                        className={cn(
                            'h-2 w-2 rounded-full',
                            task.status === TaskStatus.DONE
                                ? 'bg-green-500'
                                : task.status === TaskStatus.IN_PROGRESS
                                  ? 'bg-yellow-500'
                                  : 'bg-muted-foreground/30'
                        )}
                    />
                </button>
                <span
                    className={cn(
                        'flex-1 text-xs font-medium leading-snug',
                        task.status === TaskStatus.DONE &&
                            'text-muted-foreground line-through'
                    )}
                >
                    {task.name}
                </span>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="text-muted-foreground/40 hover:text-foreground -mr-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreVertical className="h-3 w-3" />
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
                                            onSelect={() => updateTask.mutate({ id: task.id, status: s })}
                                            className="gap-2"
                                        >
                                            <StatusIcon status={s} />
                                            {STATUS_CONFIG[s].label}
                                            {task.status === s && <Check className="ml-auto h-3.5 w-3.5" />}
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
                                            onSelect={() => updateTask.mutate({ id: task.id, priority: p })}
                                            className="gap-2"
                                        >
                                            <span className={cn('h-2 w-2 flex-shrink-0 rounded-full',
                                                p === TaskPriority.HIGH ? 'bg-rose-500' :
                                                p === TaskPriority.MEDIUM ? 'bg-blue-500' : 'bg-muted-foreground/40'
                                            )} />
                                            {p.charAt(0) + p.slice(1).toLowerCase()}
                                            {task.priority === p && <Check className="ml-auto h-3.5 w-3.5" />}
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
                                        onSelect={() => updateTask.mutate({ id: task.id, userId: null })}
                                        className="gap-2"
                                    >
                                        <div className="border-muted-foreground/30 h-5 w-5 rounded-full border-2 border-dashed" />
                                        Unassigned
                                        {!task.user && <Check className="ml-auto h-3.5 w-3.5" />}
                                    </DropdownMenuItem>
                                    {members.map((m) => (
                                        <DropdownMenuItem
                                            key={m.id}
                                            onSelect={() => updateTask.mutate({ id: task.id, userId: m.id })}
                                            className="gap-2"
                                        >
                                            <UserAvatar name={m.name} id={m.id} />
                                            {m.name}
                                            {task.user?.id === m.id && <Check className="ml-auto h-3.5 w-3.5" />}
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

            {/* Priority + assignee */}
            <div className="mt-1.5 flex items-center justify-between gap-1">
                <PriorityBadge priority={task.priority} />
                {task.user ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="rounded-full transition-opacity hover:opacity-75"
                                onClick={(e) => e.stopPropagation()}
                                title={task.user.name}
                            >
                                <UserAvatar name={task.user.name} id={task.user.id} />
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
                            </DropdownMenuItem>
                            {members.map((m) => (
                                <DropdownMenuItem
                                    key={m.id}
                                    onSelect={() => updateTask.mutate({ id: task.id, userId: m.id })}
                                    className="gap-2"
                                >
                                    <UserAvatar name={m.name} id={m.id} />
                                    {m.name}
                                    {task.user?.id === m.id && <Check className="ml-auto h-3.5 w-3.5" />}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <div className="border-muted-foreground/20 h-5 w-5 rounded-full border-2 border-dashed" />
                )}
            </div>
        </div>
    );

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger asChild>{cardContent}</ContextMenuTrigger>
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
                                        onSelect={() => updateTask.mutate({ id: task.id, status: s })}
                                        className="gap-2"
                                    >
                                        <StatusIcon status={s} />
                                        {STATUS_CONFIG[s].label}
                                        {task.status === s && <Check className="ml-auto h-3.5 w-3.5" />}
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
                                        onSelect={() => updateTask.mutate({ id: task.id, priority: p })}
                                        className="gap-2"
                                    >
                                        <span className={cn('h-2 w-2 flex-shrink-0 rounded-full',
                                            p === TaskPriority.HIGH ? 'bg-rose-500' :
                                            p === TaskPriority.MEDIUM ? 'bg-blue-500' : 'bg-muted-foreground/40'
                                        )} />
                                        {p.charAt(0) + p.slice(1).toLowerCase()}
                                        {task.priority === p && <Check className="ml-auto h-3.5 w-3.5" />}
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
                                    onSelect={() => updateTask.mutate({ id: task.id, userId: null })}
                                >
                                    Unassigned
                                    {!task.user && <Check className="ml-auto h-3.5 w-3.5" />}
                                </ContextMenuItem>
                                {members.map((m) => (
                                    <ContextMenuItem
                                        key={m.id}
                                        onSelect={() => updateTask.mutate({ id: task.id, userId: m.id })}
                                    >
                                        {m.name}
                                        {task.user?.id === m.id && <Check className="ml-auto h-3.5 w-3.5" />}
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
                        selected={task.dueDate ? new Date(task.dueDate) : undefined}
                        onSelect={(date) => {
                            if (date) {
                                date.setHours(23, 59, 59, 0);
                                updateTask.mutate({ id: task.id, dueDate: date.toISOString() });
                            } else {
                                updateTask.mutate({ id: task.id, dueDate: null });
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

function WeeklyPlanner({ tasks }: { tasks: SpotlightTask[] }) {
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
        onSuccess: () => { void utils.task.list.invalidate(); toast.success('Task deleted'); },
        onError: (err) => toast.error('Failed to delete: ' + err.message),
    });

    const weekDays = getWeekDays();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const unscheduled = tasks.filter(
        (t) => !t.dueDate && t.status !== TaskStatus.DONE
    );

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">
                        Week of{' '}
                        {weekDays[0]!.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                        })}{' '}
                        –{' '}
                        {weekDays[6]!.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                        })}
                    </CardTitle>
                    {unscheduled.length > 0 && (
                        <span className="text-muted-foreground text-xs">
                            {unscheduled.length} unscheduled
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <div className="grid min-w-[560px] grid-cols-7 gap-2">
                        {weekDays.map((day) => {
                            const isToday = isSameDay(day, today);
                            const dayTasks = tasks.filter(
                                (t) =>
                                    t.dueDate &&
                                    isSameDay(new Date(t.dueDate), day)
                            );
                            return (
                                <div key={day.toISOString()} className="flex flex-col gap-1.5">
                                    {/* Day header */}
                                    <div
                                        className={cn(
                                            'mb-1 flex flex-col items-center gap-0.5 rounded-md py-1.5',
                                            isToday
                                                ? 'bg-primary/10'
                                                : 'bg-muted/40'
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'text-[11px] font-medium uppercase tracking-wide',
                                                isToday
                                                    ? 'text-primary'
                                                    : 'text-muted-foreground'
                                            )}
                                        >
                                            {DAY_LABELS[day.getDay()]}
                                        </span>
                                        <span
                                            className={cn(
                                                'text-base font-bold leading-none',
                                                isToday
                                                    ? 'text-primary'
                                                    : 'text-foreground'
                                            )}
                                        >
                                            {day.getDate()}
                                        </span>
                                    </div>

                                    {/* Task cards */}
                                    {dayTasks.length === 0 ? (
                                        <div className="border-border/30 rounded border border-dashed py-3" />
                                    ) : (
                                        dayTasks.map((task) => (
                                            <PlannerTaskCard
                                                key={task.id}
                                                task={task}
                                                members={members}
                                                updateTask={updateTask}
                                                deleteTask={deleteTask}
                                            />
                                        ))
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function Dashboard({ userName }: Props) {
    const { data: tasks = [], isLoading } = api.task.list.useQuery();

    const now = new Date();
    const weekEnd = endOfWeek();

    const activeTasks = tasks.filter((t) => t.status !== TaskStatus.DONE);
    const doneTasks = tasks.filter((t) => t.status === TaskStatus.DONE);
    const inProgressTasks = tasks.filter(
        (t) => t.status === TaskStatus.IN_PROGRESS
    );

    const thisWeekTasks = activeTasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) < weekEnd
    );

    const highPriorityTasks = activeTasks.filter(
        (t) => t.priority === TaskPriority.HIGH
    );

    const completionRate =
        tasks.length > 0
            ? Math.round((doneTasks.length / tasks.length) * 100)
            : 0;

    return (
        <main className="mx-auto max-w-5xl px-4 py-8">
            {/* Header */}
            <div className="mb-8 flex items-start justify-between">
                <div>
                    <h1 className="mb-1 text-2xl font-semibold">
                        Welcome back, {userName}!
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Here&apos;s what&apos;s on the list for your family.
                    </p>
                </div>
                <CreateTaskDialog />
            </div>

            {/* Metrics */}
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Card>
                    <CardContent className="flex items-center gap-3 pt-4 pb-4">
                        <ListTodo className="text-muted-foreground h-5 w-5 flex-shrink-0" />
                        <div>
                            <p className="text-muted-foreground text-xs">
                                Open tasks
                            </p>
                            <p className="text-2xl font-bold leading-none mt-0.5">
                                {activeTasks.length}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-3 pt-4 pb-4">
                        <Clock className="h-5 w-5 flex-shrink-0 text-yellow-500" />
                        <div>
                            <p className="text-muted-foreground text-xs">
                                In progress
                            </p>
                            <p className="text-2xl font-bold leading-none mt-0.5 text-yellow-500">
                                {inProgressTasks.length}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-3 pt-4 pb-4">
                        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                        <div>
                            <p className="text-muted-foreground text-xs">
                                Completed
                            </p>
                            <p className="text-2xl font-bold leading-none mt-0.5 text-green-500">
                                {doneTasks.length}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-3 pt-4 pb-4">
                        <div className="relative h-5 w-5 flex-shrink-0">
                            <svg viewBox="0 0 36 36" className="h-5 w-5 -rotate-90">
                                <circle
                                    cx="18"
                                    cy="18"
                                    r="15.9"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    className="text-muted/40"
                                />
                                <circle
                                    cx="18"
                                    cy="18"
                                    r="15.9"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeDasharray={`${completionRate} 100`}
                                    className="text-green-500"
                                />
                            </svg>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">
                                Completion
                            </p>
                            <p className="text-2xl font-bold leading-none mt-0.5">
                                {completionRate}%
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Two-column spotlight section */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* This week */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">
                            Due this week
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <p className="text-muted-foreground text-sm">
                                Loading…
                            </p>
                        ) : thisWeekTasks.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                Nothing due this week.
                            </p>
                        ) : (
                            <div className="divide-border divide-y">
                                {thisWeekTasks.map((task) => (
                                    <TaskRow key={task.id} task={task} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* High priority */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                            <AlertCircle className="h-4 w-4 text-rose-500" />
                            High priority
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <p className="text-muted-foreground text-sm">
                                Loading…
                            </p>
                        ) : highPriorityTasks.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No high priority tasks.
                            </p>
                        ) : (
                            <div className="divide-border divide-y">
                                {highPriorityTasks.map((task) => (
                                    <TaskRow key={task.id} task={task} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Weekly planner */}
            <WeeklyPlanner tasks={tasks} />
        </main>
    );
}
