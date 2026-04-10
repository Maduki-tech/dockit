"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/trpc/react";

type Step = "name" | "family";

export function OnboardingClient() {
  const router = useRouter();
  const { user: clerkUser } = useUser();

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState(clerkUser?.firstName ?? "");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");

  const ensureExists = api.user.ensureExists.useMutation({
    onSuccess: () => {
      setError("");
      setStep("family");
    },
    onError: (e) => setError(e.message),
  });

  const createFamily = api.family.create.useMutation({
    onSuccess: () => router.push("/"),
    onError: (e) => setError(e.message),
  });

  const joinFamily = api.family.join.useMutation({
    onSuccess: () => router.push("/"),
    onError: (e) => setError(e.message),
  });

  if (step === "name") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to Dockit</CardTitle>
            <CardDescription>Let&apos;s get you set up. What should we call you?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) {
                    ensureExists.mutate({ name: name.trim() });
                  }
                }}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              className="w-full"
              disabled={!name.trim() || ensureExists.isPending}
              onClick={() => ensureExists.mutate({ name: name.trim() })}
            >
              {ensureExists.isPending ? "Saving…" : "Continue"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Set up your family</CardTitle>
          <CardDescription>
            Create a new family or join an existing one with an invite code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create">
            <TabsList className="w-full">
              <TabsTrigger value="create" className="flex-1">
                Create family
              </TabsTrigger>
              <TabsTrigger value="join" className="flex-1">
                Join with code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="family-name">Family name</Label>
                <Input
                  id="family-name"
                  placeholder="e.g. The Smiths"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && familyName.trim()) {
                      setError("");
                      createFamily.mutate({ name: familyName.trim() });
                    }
                  }}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                disabled={!familyName.trim() || createFamily.isPending}
                onClick={() => {
                  setError("");
                  createFamily.mutate({ name: familyName.trim() });
                }}
              >
                {createFamily.isPending ? "Creating…" : "Create family"}
              </Button>
            </TabsContent>

            <TabsContent value="join" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="invite-code">Invite code</Label>
                <Input
                  id="invite-code"
                  placeholder="e.g. A1B2C3"
                  maxLength={6}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && inviteCode.length === 6) {
                      setError("");
                      joinFamily.mutate({ inviteCode });
                    }
                  }}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                disabled={inviteCode.length !== 6 || joinFamily.isPending}
                onClick={() => {
                  setError("");
                  joinFamily.mutate({ inviteCode });
                }}
              >
                {joinFamily.isPending ? "Joining…" : "Join family"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
