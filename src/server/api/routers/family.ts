import crypto from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { FamilyRole } from '../../../../generated/prisma';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import type { db as dbType } from '~/server/db';

type AdminContext = { userId: string; db: typeof dbType };

async function requireAdmin(ctx: AdminContext) {
    const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.userId },
        select: { id: true, role: true, familyId: true },
    });
    if (!user?.familyId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not in a family.' });
    }
    if (user.role !== FamilyRole.ADMIN) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can do this.' });
    }
    return { ...user, familyId: user.familyId };
}

export const familyRouter = createTRPCRouter({
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
            const inviteCode = crypto
                .randomBytes(3)
                .toString('hex')
                .toUpperCase();
            return ctx.db.$transaction(async (tx) => {
                const family = await tx.family.create({
                    data: { name: input.name, inviteCode },
                });
                await tx.user.update({
                    where: { clerkId: ctx.userId },
                    data: { familyId: family.id, role: FamilyRole.ADMIN },
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
                    code: 'NOT_FOUND',
                    message: 'No family found with that invite code.',
                });
            }
            await ctx.db.user.update({
                where: { clerkId: ctx.userId },
                data: { familyId: family.id, role: FamilyRole.MEMBER },
            });
            return family;
        }),

    update: protectedProcedure
        .input(z.object({ id: z.number(), name: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            await requireAdmin(ctx);
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

    getMembersOfFamily: protectedProcedure
        .input(z.object({ familyId: z.number() }))
        .query(({ ctx, input }) => {
            return ctx.db.user.findMany({
                where: { familyId: input.familyId },
                select: { id: true, name: true },
            });
        }),

    getMyFamily: protectedProcedure.query(async ({ ctx }) => {
        const user = await ctx.db.user.findUnique({
            where: { clerkId: ctx.userId },
            select: { familyId: true },
        });
        if (!user?.familyId) return null;
        return ctx.db.family.findUnique({
            where: { id: user.familyId },
            select: {
                id: true,
                name: true,
                inviteCode: true,
                member: {
                    select: {
                        id: true,
                        name: true,
                        clerkId: true,
                        role: true,
                        tasks: {
                            select: { status: true },
                        },
                    },
                },
            },
        });
    }),

    assignRole: protectedProcedure
        .input(z.object({ userId: z.number(), role: z.nativeEnum(FamilyRole) }))
        .mutation(async ({ ctx, input }) => {
            const admin = await requireAdmin(ctx);
            // Target must be in the same family
            const target = await ctx.db.user.findUnique({
                where: { id: input.userId },
                select: { familyId: true },
            });
            if (target?.familyId !== admin.familyId) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not in your family.' });
            }
            return ctx.db.user.update({
                where: { id: input.userId },
                data: { role: input.role },
            });
        }),

    regenerateInviteCode: protectedProcedure.mutation(async ({ ctx }) => {
        const admin = await requireAdmin(ctx);
        const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        return ctx.db.family.update({
            where: { id: admin.familyId },
            data: { inviteCode },
        });
    }),
});
