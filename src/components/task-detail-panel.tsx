'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '~/trpc/react';
import { toast } from 'sonner';
import { TaskStatus, TaskPriority } from '../../generated/prisma';
import { cn } from '~/lib/utils';
import { useUploadThing } from '~/lib/uploadthing';
import {
    X,
    CalendarDays,
    Paperclip,
    Trash2,
    Upload,
    Circle,
    CircleDot,
    CircleCheck,
    ArrowUp,
    Minus,
    ArrowDown,
    FileText,
    Mail,
    Image as ImageIcon,
    Loader2,
} from 'lucide-react';
import { Calendar } from '~/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '~/components/ui/popover';

// ─── Types ────────────────────────────────────────────────────────────────────

type Member = { id: number; name: string };

type Attachment = {
    id: number;
    fileName: string;
    fileUrl: string;
    fileKey: string;
    fileType: string;
    fileSize: number;
    uploadedAt: Date;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700',
    'bg-violet-100 text-violet-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
];

function getInitials(name: string) {
    return name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_CONFIG: Record<
    TaskStatus,
    { label: string; icon: React.ReactNode }
> = {
    TODO: {
        label: 'Todo',
        icon: <Circle className="text-muted-foreground/60 h-4 w-4" />,
    },
    IN_PROGRESS: {
        label: 'In Progress',
        icon: <CircleDot className="h-4 w-4 text-yellow-500" />,
    },
    DONE: {
        label: 'Done',
        icon: <CircleCheck className="h-4 w-4 text-green-500" />,
    },
};

const PRIORITY_CONFIG: Record<
    TaskPriority,
    { label: string; icon: React.ReactNode; className: string }
> = {
    HIGH: {
        label: 'High',
        icon: <ArrowUp className="h-3.5 w-3.5" />,
        className: 'text-rose-600 bg-rose-50 border-rose-200',
    },
    MEDIUM: {
        label: 'Medium',
        icon: <Minus className="h-3.5 w-3.5" />,
        className: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    LOW: {
        label: 'Low',
        icon: <ArrowDown className="h-3.5 w-3.5" />,
        className: 'text-blue-600 bg-blue-50 border-blue-200',
    },
};

function AttachmentIcon({ fileType }: { fileType: string }) {
    if (fileType.startsWith('image/'))
        return <ImageIcon className="h-4 w-4 text-blue-500" />;
    if (fileType === 'application/pdf')
        return <FileText className="h-4 w-4 text-red-500" />;
    if (fileType.includes('mail') || fileType.includes('rfc822'))
        return <Mail className="h-4 w-4 text-purple-500" />;
    return <Paperclip className="text-muted-foreground h-4 w-4" />;
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
    taskId: number;
    onClose: () => void;
    members: Member[];
};

export function TaskDetailPanel({ taskId, onClose, members }: Props) {
    const utils = api.useUtils();

    const { data: task, isLoading } = api.task.get.useQuery({ id: taskId });

    const updateTask = api.task.update.useMutation({
        onSuccess: () => {
            void utils.task.get.invalidate({ id: taskId });
            void utils.task.list.invalidate();
        },
        onError: (err) => toast.error('Failed to update: ' + err.message),
    });

    const createAttachment = api.attachment.create.useMutation({
        onSuccess: () => {
            void utils.task.get.invalidate({ id: taskId });
            void utils.task.list.invalidate();
        },
        onError: (err) =>
            toast.error('Failed to save attachment: ' + err.message),
    });

    const deleteAttachment = api.attachment.delete.useMutation({
        onSuccess: () => {
            void utils.task.get.invalidate({ id: taskId });
            void utils.task.list.invalidate();
        },
        onError: (err) => toast.error('Failed to delete: ' + err.message),
    });

    const { startUpload, isUploading } = useUploadThing('taskAttachment', {
        onClientUploadComplete: (files) => {
            files.forEach((file) => {
                const serverData = file.serverData;
                createAttachment.mutate({
                    taskId,
                    fileName: serverData.fileName,
                    fileUrl: serverData.fileUrl,
                    fileKey: serverData.fileKey,
                    fileType: serverData.fileType,
                    fileSize: serverData.fileSize,
                });
            });
        },
        onUploadError: (err) => {
            toast.error('Upload failed: ' + err.message);
        },
    });

    // ── Inline editing state ──────────────────────────────────────────────

    const [titleDraft, setTitleDraft] = useState('');
    const [editingTitle, setEditingTitle] = useState(false);
    const [descDraft, setDescDraft] = useState('');
    const [editingDesc, setEditingDesc] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (task) {
            setTitleDraft(task.name);
            setDescDraft(task.description ?? '');
        }
    }, [task]);

    // Escape closes panel
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    function saveTitle() {
        if (!task) return;
        const trimmed = titleDraft.trim();
        if (trimmed && trimmed !== task.name) {
            updateTask.mutate({ id: task.id, name: trimmed });
        } else {
            setTitleDraft(task.name);
        }
        setEditingTitle(false);
    }

    function saveDesc() {
        if (!task) return;
        const trimmed = descDraft.trim() || null;
        if (trimmed !== (task.description ?? null)) {
            updateTask.mutate({ id: task.id, description: trimmed });
        }
        setEditingDesc(false);
    }

    const handleFiles = useCallback(
        (files: File[]) => {
            if (files.length === 0) return;
            void startUpload(files);
        },
        [startUpload]
    );

    function onDrop(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
        );
    }

    if (!task) return null;

    const attachments =
        (task as typeof task & { attachments?: Attachment[] }).attachments ??
        [];

    return (
        <div
            role="complementary"
            aria-label="Task details"
            className="flex h-full flex-col"
        >
            {/* ── Header ── */}
            <div className="border-border/60 flex items-center justify-between border-b px-4 py-3">
                <span className="text-muted-foreground text-xs">
                    Task #{task.id}
                </span>
                <button
                    onClick={onClose}
                    className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
                    aria-label="Close panel"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* ── Title ── */}
                <div className="px-4 pt-4 pb-2">
                    {editingTitle ? (
                        <textarea
                            autoFocus
                            rows={2}
                            value={titleDraft}
                            onChange={(e) => setTitleDraft(e.target.value)}
                            onBlur={saveTitle}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    saveTitle();
                                }
                                if (e.key === 'Escape') {
                                    setTitleDraft(task.name);
                                    setEditingTitle(false);
                                }
                            }}
                            className="text-foreground w-full resize-none bg-transparent text-base leading-snug font-semibold outline-none"
                        />
                    ) : (
                        <h2
                            className="text-foreground cursor-text text-base leading-snug font-semibold hover:opacity-70"
                            onClick={() => setEditingTitle(true)}
                        >
                            {task.name}
                        </h2>
                    )}
                </div>

                {/* ── Properties grid ── */}
                <div className="space-y-1 px-4 py-2">
                    {/* Status */}
                    <div className="flex items-center gap-3 py-1">
                        <span className="text-muted-foreground w-24 shrink-0 text-xs">
                            Status
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {Object.values(TaskStatus).map((s) => (
                                <button
                                    key={s}
                                    onClick={() =>
                                        updateTask.mutate({
                                            id: task.id,
                                            status: s,
                                        })
                                    }
                                    className={cn(
                                        'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                                        task.status === s
                                            ? 'border-foreground/20 bg-foreground/5'
                                            : 'text-muted-foreground hover:border-border hover:text-foreground border-transparent'
                                    )}
                                >
                                    {STATUS_CONFIG[s].icon}
                                    {STATUS_CONFIG[s].label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Priority */}
                    <div className="flex items-center gap-3 py-1">
                        <span className="text-muted-foreground w-24 shrink-0 text-xs">
                            Priority
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {Object.values(TaskPriority).map((p) => (
                                <button
                                    key={p}
                                    onClick={() =>
                                        updateTask.mutate({
                                            id: task.id,
                                            priority: p,
                                        })
                                    }
                                    className={cn(
                                        'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                                        task.priority === p
                                            ? PRIORITY_CONFIG[p].className
                                            : 'text-muted-foreground hover:border-border hover:text-foreground border-transparent'
                                    )}
                                >
                                    {PRIORITY_CONFIG[p].icon}
                                    {PRIORITY_CONFIG[p].label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Assignee */}
                    <div className="flex items-center gap-3 py-1">
                        <span className="text-muted-foreground w-24 shrink-0 text-xs">
                            Assignee
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                onClick={() =>
                                    updateTask.mutate({
                                        id: task.id,
                                        userId: null,
                                    })
                                }
                                className={cn(
                                    'flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors',
                                    !task.user
                                        ? 'border-foreground/20 bg-foreground/5 font-medium'
                                        : 'text-muted-foreground hover:border-border border-transparent'
                                )}
                            >
                                <div className="border-muted-foreground/30 h-4 w-4 rounded-full border border-dashed" />
                                None
                            </button>
                            {members.map((member, i) => {
                                const colorClass =
                                    AVATAR_COLORS[i % AVATAR_COLORS.length]!;
                                const isActive = task.user?.id === member.id;
                                return (
                                    <button
                                        key={member.id}
                                        onClick={() =>
                                            updateTask.mutate({
                                                id: task.id,
                                                userId: isActive
                                                    ? null
                                                    : member.id,
                                            })
                                        }
                                        className={cn(
                                            'flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors',
                                            isActive
                                                ? 'border-foreground/20 bg-foreground/5 font-medium'
                                                : 'text-muted-foreground hover:border-border hover:text-foreground border-transparent'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold',
                                                colorClass
                                            )}
                                        >
                                            {getInitials(member.name)}
                                        </div>
                                        {member.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Due date */}
                    <div className="flex items-center gap-3 py-1">
                        <span className="text-muted-foreground w-24 shrink-0 text-xs">
                            Due date
                        </span>
                        <div className="flex items-center gap-1.5">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className="border-border/60 text-foreground hover:bg-muted/40 flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        {task.dueDate
                                            ? new Date(
                                                  task.dueDate
                                              ).toLocaleDateString('en-US', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  year: 'numeric',
                                              })
                                            : 'Set date'}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                >
                                    <Calendar
                                        mode="single"
                                        selected={
                                            task.dueDate
                                                ? new Date(task.dueDate)
                                                : undefined
                                        }
                                        onSelect={(date) => {
                                            if (date)
                                                date.setHours(23, 59, 59, 0);
                                            updateTask.mutate({
                                                id: task.id,
                                                dueDate: date
                                                    ? date.toISOString()
                                                    : null,
                                            });
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            {task.dueDate && (
                                <button
                                    onClick={() =>
                                        updateTask.mutate({
                                            id: task.id,
                                            dueDate: null,
                                        })
                                    }
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                    title="Clear date"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="border-border/60 mx-4 border-t" />

                {/* ── Description ── */}
                <div className="px-4 py-3">
                    <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
                        Description
                    </p>
                    {editingDesc ? (
                        <textarea
                            autoFocus
                            rows={4}
                            value={descDraft}
                            onChange={(e) => setDescDraft(e.target.value)}
                            onBlur={saveDesc}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setDescDraft(task.description ?? '');
                                    setEditingDesc(false);
                                }
                            }}
                            placeholder="Add a description…"
                            className="placeholder:text-muted-foreground/40 text-foreground w-full resize-none bg-transparent text-sm leading-relaxed outline-none"
                        />
                    ) : (
                        <p
                            className={cn(
                                'cursor-text text-sm leading-relaxed',
                                task.description
                                    ? 'text-foreground'
                                    : 'text-muted-foreground/50'
                            )}
                            onClick={() => setEditingDesc(true)}
                        >
                            {task.description ?? 'Add a description…'}
                        </p>
                    )}
                </div>

                <div className="border-border/60 mx-4 border-t" />

                {/* ── Attachments ── */}
                <div className="px-4 py-3">
                    <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                        Attachments
                    </p>

                    {/* Drop zone */}
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={onDrop}
                        className={cn(
                            'border-border/60 mb-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors',
                            isDragging
                                ? 'border-primary/60 bg-primary/5'
                                : 'hover:border-border hover:bg-muted/20'
                        )}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {isUploading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                                <span className="text-muted-foreground text-xs">
                                    Uploading…
                                </span>
                            </div>
                        ) : (
                            <>
                                <Upload className="text-muted-foreground/50 mb-1 h-5 w-5" />
                                <p className="text-muted-foreground text-xs">
                                    Drop files here or click to upload
                                </p>
                                <p className="text-muted-foreground/50 mt-0.5 text-[11px]">
                                    Images, PDFs, emails — up to 16 MB
                                </p>
                            </>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            const files = Array.from(e.target.files ?? []);
                            handleFiles(files);
                            e.target.value = '';
                        }}
                    />

                    {/* Attachment list */}
                    {attachments.length > 0 && (
                        <div className="space-y-1.5">
                            {attachments.map((att) => (
                                <div
                                    key={att.id}
                                    className="border-border/40 hover:bg-muted/20 flex items-center gap-2.5 rounded-md border p-2 transition-colors"
                                >
                                    <AttachmentIcon fileType={att.fileType} />

                                    {att.fileType.startsWith('image/') ? (
                                        <a
                                            href={att.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="min-w-0 flex-1"
                                        >
                                            <img
                                                src={att.fileUrl}
                                                alt={att.fileName}
                                                className="mb-1 max-h-32 w-full rounded object-cover"
                                            />
                                            <p className="text-foreground truncate text-xs font-medium">
                                                {att.fileName}
                                            </p>
                                        </a>
                                    ) : (
                                        <a
                                            href={att.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="min-w-0 flex-1"
                                        >
                                            <p className="text-foreground hover:text-primary truncate text-xs font-medium transition-colors">
                                                {att.fileName}
                                            </p>
                                            <p className="text-muted-foreground text-[11px]">
                                                {formatFileSize(att.fileSize)}
                                            </p>
                                        </a>
                                    )}

                                    <button
                                        onClick={() =>
                                            deleteAttachment.mutate({
                                                id: att.id,
                                            })
                                        }
                                        disabled={deleteAttachment.isPending}
                                        className="text-muted-foreground/40 hover:text-destructive flex-shrink-0 transition-colors"
                                        title="Delete attachment"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
