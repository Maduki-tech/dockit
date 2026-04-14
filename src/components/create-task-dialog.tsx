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
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { toast } from 'sonner';

export function CreateTaskDialog() {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');

    const utils = api.useUtils();
    const createTask = api.task.create.useMutation({
        onSuccess: async () => {
            await utils.task.list.invalidate();
            setName('');
            setOpen(false);
            toast.success('Task created successfully!');
        },
        onError: (error) => {
            toast.error('Failed to create task: ' + error.message);
        },
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        createTask.mutate({ name: name.trim() });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="mb-4">
                    + Create Task
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
                    {createTask.error && (
                        <p className="text-destructive text-sm">
                            {createTask.error.message}
                        </p>
                    )}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
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
