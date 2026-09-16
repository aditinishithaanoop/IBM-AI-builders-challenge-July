-- AlterTable
ALTER TABLE "task" ALTER COLUMN "assignedTo" SET DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "task_organizationId_idx" ON "task"("organizationId");
