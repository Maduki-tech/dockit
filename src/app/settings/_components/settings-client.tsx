"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Crown, RefreshCw, LogOut } from "lucide-react";
import { toast } from "sonner";
import { FamilyRole } from "../../../../generated/prisma";
import { api } from "~/trpc/react";
import { ThemeToggle } from "~/components/theme-toggle";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export function SettingsClient() {
  const router = useRouter();
  const { data: user, refetch: refetchUser } = api.user.me.useQuery();
  const { data: family, refetch: refetchFamily } = api.family.getMyFamily.useQuery();

  const [displayName, setDisplayName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  const isAdmin = user?.role === FamilyRole.ADMIN;

  const updateMe = api.user.updateMe.useMutation({
    onSuccess: () => {
      toast.success("Display name updated.");
      setDisplayName("");
      void refetchUser();
    },
    onError: () => toast.error("Failed to update name."),
  });

  const updateFamily = api.family.update.useMutation({
    onSuccess: () => {
      toast.success("Family name updated.");
      setFamilyName("");
      void refetchFamily();
    },
    onError: (e) => toast.error(e.message),
  });

  const regenerateCode = api.family.regenerateInviteCode.useMutation({
    onSuccess: () => {
      toast.success("Invite code regenerated.");
      void refetchFamily();
    },
    onError: (e) => toast.error(e.message),
  });

  const leaveFamily = api.user.leaveFamily.useMutation({
    onSuccess: () => router.push("/onboarding"),
    onError: () => toast.error("Failed to leave family."),
  });

  function copyCode() {
    if (!family?.inviteCode) return;
    void navigator.clipboard.writeText(family.inviteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update how your name appears to family members.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <p className="text-sm text-muted-foreground">
              Current:{" "}
              <span className="font-medium text-foreground">{user?.name ?? "…"}</span>
            </p>
            <div className="flex gap-2">
              <Input
                id="display-name"
                placeholder="New display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="max-w-xs"
              />
              <Button
                onClick={() => updateMe.mutate({ name: displayName })}
                disabled={!displayName.trim() || updateMe.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Family */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            Family
            {isAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                <Crown className="h-3 w-3" />
                Admin
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? "Manage your family name and invite code."
              : "View your family invite code. Only admins can rename the family."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {/* Rename — admin only */}
          <div className="space-y-2">
            <Label htmlFor="family-name">Family name</Label>
            <p className="text-sm text-muted-foreground">
              Current:{" "}
              <span className="font-medium text-foreground">{family?.name ?? "…"}</span>
            </p>
            {isAdmin ? (
              <div className="flex gap-2">
                <Input
                  id="family-name"
                  placeholder="New family name"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="max-w-xs"
                />
                <Button
                  onClick={() => {
                    if (family?.id) updateFamily.mutate({ id: family.id, name: familyName });
                  }}
                  disabled={!familyName.trim() || updateFamily.isPending || !family?.id}
                >
                  Save
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Ask an admin to rename the family.
              </p>
            )}
          </div>

          {/* Invite code */}
          <div className="space-y-2">
            <Label>Invite code</Label>
            <p className="text-sm text-muted-foreground">
              Share this code with someone to let them join your family.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex h-9 items-center rounded-md border bg-muted px-3 font-mono text-sm tracking-widest">
                {family?.inviteCode ?? "……"}
              </div>
              <Button variant="outline" size="icon" onClick={copyCode} title="Copy code">
                {codeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => regenerateCode.mutate()}
                  disabled={regenerateCode.isPending}
                  title="Regenerate code"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${regenerateCode.isPending ? "animate-spin" : ""}`}
                  />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose between light, dark, or system theme.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <ThemeToggle />
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="ring-destructive/30">
        <CardHeader className="border-b border-destructive/20">
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>Irreversible actions — proceed with caution.</CardDescription>
        </CardHeader>
        <CardFooter className="flex items-center justify-between gap-4 bg-destructive/5">
          <div>
            <p className="text-sm font-medium">Leave family</p>
            <p className="text-xs text-muted-foreground">
              You will be taken to onboarding to create or join a new family.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => leaveFamily.mutate()}
            disabled={leaveFamily.isPending}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Leave family
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
