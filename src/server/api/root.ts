import { familyRouter } from "~/server/api/routers/family";
import { userRouter } from "~/server/api/routers/user";
import { taskRouter } from "~/server/api/routers/task";
import { attachmentRouter } from "~/server/api/routers/attachment";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  family: familyRouter,
  user: userRouter,
  task: taskRouter,
  attachment: attachmentRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
