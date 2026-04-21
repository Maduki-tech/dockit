'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Plus, CalendarDays, ArrowUp, Minus, ArrowDown, X } from 'lucide-react';
import { Calendar } from '~/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '~/components/ui/popover';
import { toast } from 'sonner';
import { TaskPriority } from '../../generated/prisma';
import { cn } from '~/lib/utils';

const PRIORITY_OPTIONS = [
    {
        value: TaskPriority.LOW,
        label: 'Low',
        icon: ArrowDown,
        className:
            'text-blue-500 border-blue-200 hover:border-blue-400 hover:bg-blue-50',
        activeClassName: 'bg-blue-50 border-blue-400 text-blue-600',
    },
    {
        value: TaskPriority.MEDIUM,
        label: 'Medium',
        icon: Minus,
        className:
            'text-amber-500 border-amber-200 hover:border-amber-400 hover:bg-amber-50',
        activeClassName: 'bg-amber-50 border-amber-400 text-amber-600',
    },
    {
        value: TaskPriority.HIGH,
        label: 'High',
        icon: ArrowUp,
        className:
            'text-red-500 border-red-200 hover:border-red-400 hover:bg-red-50',
        activeClassName: 'bg-red-50 border-red-400 text-red-600',
    },
] as const;

function getInitials(name: string) {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

const AVATAR_COLORS = [
    'bg-violet-100 text-violet-700',
    'bg-teal-100 text-teal-700',
    'bg-rose-100 text-rose-700',
    'bg-sky-100 text-sky-700',
    'bg-orange-100 text-orange-700',
];

export function CreateTaskDialog() {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [assigneeId, setAssigneeId] = useState<string>('');
    const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined);

    const { data: me } = api.user.me.useQuery();
    const { data: members = [] } = api.family.getMembersOfFamily.useQuery(
        { familyId: me?.familyId ?? 0 },
        { enabled: !!me?.familyId }
    );


    const utils = api.useUtils();
    const createTask = api.task.create.useMutation({
        onSuccess: async () => {
            await utils.task.list.invalidate();
            handleOpenChange(false);
            toast.success('Task created!');
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        createTask.mutate({
            name: name.trim(),
            userId: assigneeId ? Number(assigneeId) : undefined,
            priority,
            dueDate: dueDate ? dueDate.toISOString() : undefined,
        });
    }

    function handleOpenChange(next: boolean) {
        if (!next) {
            setName('');
            setAssigneeId('');
            setPriority(TaskPriority.MEDIUM);
            setDueDate(undefined);
        }
        setOpen(next);
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    New task
                </Button>
            </DialogTrigger>
            <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
                <DialogTitle className="px-6 pt-6 pb-1 text-lg font-semibold">
                    Create new task
                </DialogTitle>
                <form onSubmit={handleSubmit}>
                    {/* Task name */}
                    <div className="px-6 pt-4 pb-5">
                        <textarea
                            rows={1}
                            placeholder="What needs to be done?"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            className="placeholder:text-muted-foreground/40 text-foreground w-full resize-none bg-transparent text-base leading-snug font-medium outline-none"
                        />
                    </div>

                    <div className="border-border/60 border-t" />

                    {/* Options row */}
                    <div className="space-y-4 px-6 py-5">
                        {/* Priority */}
                        <div className="flex items-center gap-3">
                            <span className="text-muted-foreground w-20 shrink-0 text-sm">
                                Priority
                            </span>
                            <div className="flex gap-2">
                                {PRIORITY_OPTIONS.map(
                                    ({
                                        value,
                                        label,
                                        icon: Icon,
                                        className,
                                        activeClassName,
                                    }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setPriority(value)}
                                            className={cn(
                                                'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                                                priority === value
                                                    ? activeClassName
                                                    : className
                                            )}
                                        >
                                            <Icon className="h-3 w-3" />
                                            {label}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Due date */}
                        <div className="flex items-center gap-3">
                            <span className="text-muted-foreground w-20 shrink-0 text-sm">
                                Due
                            </span>
                            <div className="flex items-center gap-1">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className={cn(
                                                'border-border/60 flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors',
                                                dueDate
                                                    ? 'text-foreground'
                                                    : 'text-muted-foreground'
                                            )}
                                        >
                                            <CalendarDays className="h-3.5 w-3.5" />
                                            {dueDate
                                                ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                : 'Pick a date'}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={dueDate}
                                            onSelect={(date) => {
                                                if (date) {
                                                    date.setHours(23, 59, 59, 0);
                                                }
                                                setDueDate(date ?? undefined);
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                {dueDate && (
                                    <button
                                        type="button"
                                        onClick={() => setDueDate(undefined)}
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Assignee */}
                        {members.length > 0 && (
                            <div className="flex items-center gap-3">
                                <span className="text-muted-foreground w-20 shrink-0 text-sm">
                                    Assign
                                </span>
                                <div className="flex gap-1.5">
                                    {members.map((member, i) => {
                                        const isActive =
                                            assigneeId === String(member.id);
                                        const colorClass =
                                            AVATAR_COLORS[
                                                i % AVATAR_COLORS.length
                                            ]!;
                                        return (
                                            <button
                                                key={member.id}
                                                type="button"
                                                title={member.name ?? undefined}
                                                onClick={() =>
                                                    setAssigneeId(
                                                        isActive
                                                            ? ''
                                                            : String(member.id)
                                                    )
                                                }
                                                className={cn(
                                                    'h-7 w-7 rounded-full text-xs font-semibold ring-2 transition-all',
                                                    colorClass,
                                                    isActive
                                                        ? 'ring-foreground/40 scale-110'
                                                        : 'hover:ring-foreground/20 ring-transparent'
                                                )}
                                            >
                                                {getInitials(
                                                    member.name ?? '?'
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-border/60 border-t" />

                    {/* Footer */}
                    <div className="flex justify-end gap-2 px-6 py-4">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={!name.trim() || createTask.isPending}
                        >
                            {createTask.isPending ? 'Adding…' : 'Add task'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
