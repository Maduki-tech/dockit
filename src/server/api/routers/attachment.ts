import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { UTApi } from 'uploadthing/server';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { getCallerFamilyId } from '~/server/api/utils';

const utapi = new UTApi();

export const attachmentRouter = createTRPCRouter({
    create: protectedProcedure
        .input(
            z.object({
                taskId: z.number(),
                fileName: z.string(),
                fileUrl: z.string().url(),
                fileKey: z.string(),
                fileType: z.string(),
                fileSize: z.number(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const familyId = await getCallerFamilyId(ctx.db, ctx.userId);
            const task = await ctx.db.task.findFirst({
                where: { id: input.taskId, familyId },
            });
            if (!task) throw new TRPCError({ code: 'FORBIDDEN' });
            return ctx.db.attachment.create({ data: input });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const familyId = await getCallerFamilyId(ctx.db, ctx.userId);
            const attachment = await ctx.db.attachment.findFirst({
                where: { id: input.id, task: { familyId } },
            });
            if (!attachment) throw new TRPCError({ code: 'NOT_FOUND' });
            await utapi.deleteFiles(attachment.fileKey);
            return ctx.db.attachment.delete({ where: { id: input.id } });
        }),

    listByTask: protectedProcedure
        .input(z.object({ taskId: z.number() }))
        .query(({ ctx, input }) => {
            return ctx.db.attachment.findMany({
                where: { taskId: input.taskId },
                orderBy: { uploadedAt: 'asc' },
            });
        }),
});
