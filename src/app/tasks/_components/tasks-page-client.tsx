'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
import { cn } from '~/lib/utils';
import { TasksView } from '~/components/tasks-view';
import { TaskDetailPanel } from '~/components/task-detail-panel';
import { CreateTaskDialog } from '~/components/create-task-dialog';

export function TasksPageClient() {
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

    const { data: me } = api.user.me.useQuery();
    const { data: members = [] } = api.family.getMembersOfFamily.useQuery(
        { familyId: me?.familyId ?? 0 },
        { enabled: !!me?.familyId }
    );

    return (
        <div className="flex min-h-[calc(100vh-64px)] overflow-hidden">
            {/* Left: task list */}
            <div className="min-w-0 flex-1 overflow-y-auto">
                <div
                    className={cn(
                        'mx-auto px-4 py-8 transition-all duration-200',
                        selectedTaskId ? 'max-w-2xl' : 'max-w-5xl'
                    )}
                >
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">
                                Tasks
                            </h1>
                            <p className="text-muted-foreground mt-0.5 text-sm">
                                Click any task to view details.
                            </p>
                        </div>
                        <CreateTaskDialog />
                    </div>
                    <TasksView
                        selectedTaskId={selectedTaskId}
                        onSelectTask={setSelectedTaskId}
                    />
                </div>
            </div>

            {/* Right: detail panel */}
            {selectedTaskId !== null && (
                <div className="border-border w-[420px] flex-shrink-0 overflow-y-auto border-l">
                    <TaskDetailPanel
                        taskId={selectedTaskId}
                        onClose={() => setSelectedTaskId(null)}
                        members={members}
                    />
                </div>
            )}
        </div>
    );
}
