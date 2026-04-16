import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { TaskStatus } from '../../../../generated/prisma';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';

async function getCallerFamilyId(
    db: { user: { findUnique: Function } },
    clerkId: string
) {
    const user = await db.user.findUnique({
        where: { clerkId },
        select: { familyId: true },
    });
    if (!user?.familyId) {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You are not part of a family.',
        });
    }
    return user.familyId;
}

export const taskRouter = createTRPCRouter({
    list: protectedProcedure
        .input(
            z
                .object({
                    userId: z.number().optional(),
                    status: z.nativeEnum(TaskStatus).optional(),
                })
                .optional()
        )
        .query(async ({ ctx, input }) => {
            const familyId = await getCallerFamilyId(ctx.db, ctx.userId);
            console.log('FamilyID', familyId);
            return ctx.db.task.findMany({
                where: {
                    familyId: { equals: familyId },
                    ...(input?.userId !== undefined && {
                        userId: input.userId,
                    }),
                    ...(input?.status !== undefined && {
                        status: input.status,
                    }),
                },
                orderBy: { status: 'asc' },
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
            })
        )
        .mutation(async ({ ctx, input }) => {
            const familyId = await getCallerFamilyId(ctx.db, ctx.userId);
            return ctx.db.task.create({ data: { ...input, familyId } });
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.number(),
                name: z.string().min(1).optional(),
                status: z.nativeEnum(TaskStatus).optional(),
                userId: z.number().nullable().optional(),
            })
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
