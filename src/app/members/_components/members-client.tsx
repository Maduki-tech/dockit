'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { TaskStatus, FamilyRole } from '../../../../generated/prisma';
import { cn } from '~/lib/utils';
import { Check, Copy, Crown, Link2, Shield, Users } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { toast } from 'sonner';

function MemberAvatar({ name }: { name: string }) {
    const initials = name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const colors = [
        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
        'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    ];
    const color = colors[name.charCodeAt(0) % colors.length];

    return (
        <div
            className={cn(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                color
            )}
        >
            {initials}
        </div>
    );
}

function MiniBar({ value, max }: { value: number; max: number }) {
    const pct = max === 0 ? 0 : Math.round((value / max) * 100);
    return (
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

function RoleBadge({ role }: { role: FamilyRole }) {
    if (role === FamilyRole.ADMIN) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                <Crown className="h-3 w-3" />
                Admin
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            <Shield className="h-3 w-3" />
            Member
        </span>
    );
}

export function MembersClient({ currentClerkId }: { currentClerkId: string }) {
    const { data: family, isLoading, refetch } = api.family.getMyFamily.useQuery();
    const [copied, setCopied] = useState(false);

    const assignRole = api.family.assignRole.useMutation({
        onSuccess: () => {
            toast.success('Role updated.');
            void refetch();
        },
        onError: (e) => toast.error(e.message),
    });

    function copyInviteCode() {
        if (!family) return;
        void navigator.clipboard.writeText(family.inviteCode).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    if (isLoading) {
        return (
            <p className="mt-4 text-sm text-muted-foreground">Loading members…</p>
        );
    }

    if (!family) {
        return (
            <p className="mt-4 text-sm text-muted-foreground">No family found.</p>
        );
    }

    const currentMember = family.member.find((m) => m.clerkId === currentClerkId);
    const isAdmin = currentMember?.role === FamilyRole.ADMIN;

    return (
        <div className="space-y-6">
            {/* Invite card */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        Invite someone to {family.name}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="mb-3 text-sm text-muted-foreground">
                        Share this invite code. Anyone who enters it during onboarding
                        will join your family.
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 rounded-md border bg-muted/40 px-4 py-2.5 font-mono text-lg font-bold tracking-[0.3em]">
                            {family.inviteCode}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={copyInviteCode}
                        >
                            {copied ? (
                                <>
                                    <Check className="h-3.5 w-3.5 text-green-500" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3.5 w-3.5" />
                                    Copy
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Member list */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        Members
                        <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                            {family.member.length}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {family.member.map((member) => {
                        const total = member.tasks.length;
                        const done = member.tasks.filter(
                            (t) => t.status === TaskStatus.DONE
                        ).length;
                        const inProgress = member.tasks.filter(
                            (t) => t.status === TaskStatus.IN_PROGRESS
                        ).length;
                        const todo = member.tasks.filter(
                            (t) => t.status === TaskStatus.TODO
                        ).length;
                        const isMe = member.clerkId === currentClerkId;
                        const isPending =
                            assignRole.isPending &&
                            assignRole.variables?.userId === member.id;

                        return (
                            <div
                                key={member.id}
                                className="flex items-start gap-3 rounded-lg border p-3"
                            >
                                <MemberAvatar name={member.name} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-medium">
                                            {member.name}
                                        </span>
                                        <RoleBadge role={member.role} />
                                        {isMe && (
                                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                                You
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                                            {todo} to do
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                                            {inProgress} in progress
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                            {done} done
                                        </span>
                                    </div>
                                    {total > 0 && (
                                        <MiniBar value={done} max={total} />
                                    )}
                                </div>
                                <div className="flex flex-shrink-0 flex-col items-end gap-2">
                                    {total > 0 && (
                                        <div className="text-right">
                                            <span className="text-sm font-semibold">
                                                {Math.round((done / total) * 100)}%
                                            </span>
                                            <p className="text-xs text-muted-foreground">
                                                complete
                                            </p>
                                        </div>
                                    )}
                                    {isAdmin && !isMe && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs"
                                            disabled={isPending}
                                            onClick={() =>
                                                assignRole.mutate({
                                                    userId: member.id,
                                                    role:
                                                        member.role === FamilyRole.ADMIN
                                                            ? FamilyRole.MEMBER
                                                            : FamilyRole.ADMIN,
                                                })
                                            }
                                        >
                                            {isPending
                                                ? '…'
                                                : member.role === FamilyRole.ADMIN
                                                  ? 'Remove admin'
                                                  : 'Make admin'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
}
