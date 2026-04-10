import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";


export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(({ ctx }) => {
    return ctx.db.user.findUnique({
      where: { clerkId: ctx.userId },
      include: { family: true },
    });
  }),

  ensureExists: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      return ctx.db.user.upsert({
        where: { clerkId: ctx.userId },
        create: { clerkId: ctx.userId, name: input.name },
        update: {},
      });
    }),

  list: protectedProcedure.query(({ ctx }) => {
    return ctx.db.user.findMany({ include: { tasks: true } });
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => {
      return ctx.db.user.findUnique({
        where: { id: input.id },
        include: { tasks: true },
      });
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), familyId: z.number().optional() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.user.create({
        data: { ...input, clerkId: ctx.userId },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        familyId: z.number().nullable().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.user.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.user.delete({ where: { id: input.id } });
    }),
});
