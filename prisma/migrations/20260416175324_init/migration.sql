/*
  Warnings:

  - Added the required column `familyId` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "familyId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "Task_familyId_status_idx" ON "Task"("familyId", "status");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
