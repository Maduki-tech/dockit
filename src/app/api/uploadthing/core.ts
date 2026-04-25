import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { auth } from '@clerk/nextjs/server';
import { db } from '~/server/db';

const f = createUploadthing();

export const ourFileRouter = {
    taskAttachment: f({
        image: { maxFileSize: '8MB', maxFileCount: 10 },
        pdf: { maxFileSize: '16MB', maxFileCount: 5 },
        blob: { maxFileSize: '16MB', maxFileCount: 5 },
    })
        .middleware(async () => {
            const { userId: clerkId } = await auth();
            if (!clerkId) throw new Error('Unauthorized');
            const user = await db.user.findUnique({
                where: { clerkId },
                select: { id: true, familyId: true },
            });
            if (!user?.familyId) throw new Error('Not in a family');
            return { userId: user.id };
        })
        .onUploadComplete(async ({ file }) => {
            return {
                fileKey: file.key,
                fileUrl: file.ufsUrl,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
            };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
