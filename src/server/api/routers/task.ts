import { z } from 'zod';
import { TaskStatus, TaskPriority } from '../../../../generated/prisma';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { getCallerFamilyId } from '~/server/api/utils';

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
                include: { user: true, _count: { select: { attachments: true } } },
            });
        }),

    get: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(({ ctx, input }) => {
            return ctx.db.task.findUnique({
                where: { id: input.id },
                include: { user: true, attachments: { orderBy: { uploadedAt: 'asc' } } },
            });
        }),

    create: protectedProcedure
        .input(
            z.object({
                name: z.string().min(1),
                description: z.string().optional(),
                userId: z.number().optional(),
                status: z.nativeEnum(TaskStatus).optional(),
                priority: z.nativeEnum(TaskPriority).optional(),
                dueDate: z.string().datetime().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const familyId = await getCallerFamilyId(ctx.db, ctx.userId);
            const { dueDate, ...rest } = input;
            return ctx.db.task.create({
                data: {
                    ...rest,
                    familyId,
                    ...(dueDate && { dueDate: new Date(dueDate) }),
                },
            });
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.number(),
                name: z.string().min(1).optional(),
                description: z.string().nullable().optional(),
                status: z.nativeEnum(TaskStatus).optional(),
                priority: z.nativeEnum(TaskPriority).optional(),
                dueDate: z.string().datetime().nullable().optional(),
                userId: z.number().nullable().optional(),
            })
        )
        .mutation(({ ctx, input }) => {
            const { id, dueDate, ...rest } = input;
            return ctx.db.task.update({
                where: { id },
                data: {
                    ...rest,
                    ...(dueDate !== undefined && {
                        dueDate: dueDate ? new Date(dueDate) : null,
                    }),
                },
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(({ ctx, input }) => {
            return ctx.db.task.delete({ where: { id: input.id } });
        }),
});
