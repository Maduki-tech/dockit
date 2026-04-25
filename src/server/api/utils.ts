import { TRPCError } from '@trpc/server';
import { type db as prismaDb } from '~/server/db';

type DbClient = typeof prismaDb;

export async function getCallerFamilyId(
    db: DbClient,
    clerkId: string
): Promise<number> {
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
