'use client';

import { useState, useEffect } from 'react';
import { api } from '~/trpc/react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Plus, Calendar, ArrowUp, Minus, ArrowDown } from 'lucide-react';
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
    const [dueDate, setDueDate] = useState<string>('');

    const { data: me } = api.user.me.useQuery();
    const { data: members = [] } = api.family.getMembersOfFamily.useQuery(
        { familyId: me?.familyId ?? 0 },
        { enabled: !!me?.familyId }
    );

    // Pre-select the current user when the dialog opens
    useEffect(() => {
        if (open && me?.id) {
            setAssigneeId(String(me.id));
        }
    }, [open, me?.id]);

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
            dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        });
    }

    function handleOpenChange(next: boolean) {
        if (!next) {
            setName('');
            setAssigneeId('');
            setPriority(TaskPriority.MEDIUM);
            setDueDate('');
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
            <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-sm">
                <DialogTitle className="p-5 text-base font-medium">
                    Create new task
                </DialogTitle>
                <form onSubmit={handleSubmit}>
                    {/* Task name */}
                    <div className="px-5 pt-5 pb-4">
                        <textarea
                            rows={2}
                            placeholder="What needs to be done?"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            className="placeholder:text-muted-foreground/40 text-foreground w-full resize-none bg-transparent text-base leading-snug font-medium outline-none"
                        />
                    </div>

                    <div className="border-border/60 border-t" />

                    {/* Options row */}
                    <div className="space-y-3 px-5 py-3">
                        {/* Priority */}
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-16 shrink-0 text-xs">
                                Priority
                            </span>
                            <div className="flex gap-1.5">
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
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-16 shrink-0 text-xs">
                                Due
                            </span>
                            <div className="relative flex flex-1 items-center">
                                <Calendar className="text-muted-foreground pointer-events-none absolute left-2 h-3.5 w-3.5" />
                                <Input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="border-border/60 h-7 w-full pr-2 pl-7 text-xs"
                                />
                            </div>
                        </div>

                        {/* Assignee */}
                        {members.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground w-16 shrink-0 text-xs">
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
                    <div className="flex justify-end gap-2 px-5 py-3">
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
