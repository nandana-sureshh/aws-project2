-- AlterTable
ALTER TABLE "documents" ADD COLUMN "aiSummary" TEXT;
ALTER TABLE "documents" ADD COLUMN "aiSummaryStatus" TEXT NOT NULL DEFAULT 'PENDING';
