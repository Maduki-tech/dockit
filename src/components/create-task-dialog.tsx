'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from '~/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '~/components/ui/select';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { TaskPriority } from '../../generated/prisma';

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

    const utils = api.useUtils();
    const createTask = api.task.create.useMutation({
        onSuccess: async () => {
            await utils.task.list.invalidate();
            handleOpenChange(false);
            toast.success('Task created successfully!');
        },
        onError: (error) => {
            toast.error('Failed to create task: ' + error.message);
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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Task</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="task-name">Task name</Label>
                        <Input
                            id="task-name"
                            placeholder="e.g. Buy groceries"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select
                                value={priority}
                                onValueChange={(v) =>
                                    setPriority(v as TaskPriority)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={TaskPriority.LOW}>
                                        Low
                                    </SelectItem>
                                    <SelectItem value={TaskPriority.MEDIUM}>
                                        Medium
                                    </SelectItem>
                                    <SelectItem value={TaskPriority.HIGH}>
                                        High
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="due-date">Due date</Label>
                            <Input
                                id="due-date"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Assign to</Label>
                        <Select
                            value={assigneeId}
                            onValueChange={setAssigneeId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent position="popper" align="start">
                                {members.map((member) => (
                                    <SelectItem
                                        key={member.id}
                                        value={String(member.id)}
                                    >
                                        {member.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {createTask.error && (
                        <p className="text-destructive text-sm">
                            {createTask.error.message}
                        </p>
                    )}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!name.trim() || createTask.isPending}
                        >
                            {createTask.isPending ? 'Creating…' : 'Create Task'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
