'use client';

import { api } from '~/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { TaskList } from '~/components/task-list';
import { CreateTaskDialog } from '~/components/create-task-dialog';
import { TaskPriority, TaskStatus } from '../../../generated/prisma';
import { cn } from '~/lib/utils';
import { AlertCircle, CheckCircle2, Clock, ListTodo } from 'lucide-react';

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

function TaskRow({
    task,
}: {
    task: {
        id: number;
        name: string;
        status: TaskStatus;
        priority: TaskPriority;
        dueDate: Date | null;
        user: { name: string; id: number } | null;
    };
}) {
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
                    <span className="text-muted-foreground text-xs">
                        {task.user.name}
                    </span>
                )}
            </div>
        </div>
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

            {/* Full task list */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">
                        All tasks
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <TaskList />
                </CardContent>
            </Card>
        </main>
    );
}
