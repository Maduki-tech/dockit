import { z } from "zod";
import { TaskStatus } from "../../../../generated/prisma";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const taskRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          userId: z.number().optional(),
          status: z.nativeEnum(TaskStatus).optional(),
        })
        .optional(),
    )
    .query(({ ctx, input }) => {
      return ctx.db.task.findMany({
        where: {
          ...(input?.userId !== undefined && { userId: input.userId }),
          ...(input?.status !== undefined && { status: input.status }),
        },
        include: { user: true },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => {
      return ctx.db.task.findUnique({
        where: { id: input.id },
        include: { user: true },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        userId: z.number().optional(),
        status: z.nativeEnum(TaskStatus).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.task.create({ data: input });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        status: z.nativeEnum(TaskStatus).optional(),
        userId: z.number().nullable().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.task.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.task.delete({ where: { id: input.id } });
    }),
});
