import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const familyRouter = createTRPCRouter({
  list: protectedProcedure.query(({ ctx }) => {
    return ctx.db.family.findMany({ include: { member: true } });
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => {
      return ctx.db.family.findUnique({
        where: { id: input.id },
        include: { member: true },
      });
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const inviteCode = crypto.randomBytes(3).toString("hex").toUpperCase();
      return ctx.db.$transaction(async (tx) => {
        const family = await tx.family.create({
          data: { name: input.name, inviteCode },
        });
        await tx.user.update({
          where: { clerkId: ctx.userId },
          data: { familyId: family.id },
        });
        return family;
      });
    }),

  join: protectedProcedure
    .input(z.object({ inviteCode: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const family = await ctx.db.family.findUnique({
        where: { inviteCode: input.inviteCode.toUpperCase() },
      });
      if (!family) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No family found with that invite code.",
        });
      }
      await ctx.db.user.update({
        where: { clerkId: ctx.userId },
        data: { familyId: family.id },
      });
      return family;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      return ctx.db.family.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.family.delete({ where: { id: input.id } });
    }),
});
