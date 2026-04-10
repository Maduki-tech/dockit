"use client";

import { api } from "~/trpc/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

type Task = {
  id: number;
  name: string;
  status: string;
  user: { name: string } | null;
};

type Props = {
  userName: string;
};

export function Dashboard({ userName }: Props) {
  const { data: tasks = [], isLoading } = api.task.list.useQuery();

  const todo = tasks.filter((t) => t.status === "TODO");
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS");
  const done = tasks.filter((t) => t.status === "DONE");

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold">
          Welcome back, {userName}!
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Here&apos;s what&apos;s on the list for your family.
        </p>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                To Do
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{todo.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-yellow-500">
                {inProgress.length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Done
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-green-500">{done.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Task list */}
        <Tabs defaultValue="todo">
          <TabsList className="mb-4">
            <TabsTrigger value="todo">To Do ({todo.length})</TabsTrigger>
            <TabsTrigger value="inprogress">
              In Progress ({inProgress.length})
            </TabsTrigger>
            <TabsTrigger value="done">Done ({done.length})</TabsTrigger>
          </TabsList>

          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading tasks…</p>
          )}

          <TabsContent value="todo">
            <TaskList tasks={todo} />
          </TabsContent>
          <TabsContent value="inprogress">
            <TaskList tasks={inProgress} />
          </TabsContent>
          <TabsContent value="done">
            <TaskList tasks={done} />
          </TabsContent>
        </Tabs>
      </main>
  );
}

function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">No tasks here yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardContent className="flex items-center justify-between py-3">
            <span className="font-medium">{task.name}</span>
            {task.user && (
              <span className="text-xs text-muted-foreground">
                {task.user.name}
              </span>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
