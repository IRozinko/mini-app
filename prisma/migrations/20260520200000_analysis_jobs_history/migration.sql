-- CreateEnum
CREATE TYPE "AnalysisJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "AnalysisJobTrigger" AS ENUM ('CREATE', 'RETRY', 'REANALYZE', 'EDIT');

-- CreateTable
CREATE TABLE "DecisionAnalysisRun" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "cognitiveBiases" JSONB NOT NULL,
    "missedAlternatives" JSONB NOT NULL,
    "summary" TEXT,
    "risks" JSONB,
    "reflectionQuestions" JSONB,
    "nextSteps" JSONB,
    "qualityScore" INTEGER,
    "rawResponse" JSONB,
    "provider" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionAnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisJob" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AnalysisJobStatus" NOT NULL DEFAULT 'QUEUED',
    "trigger" "AnalysisJobTrigger" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DecisionAnalysisRun_decisionId_createdAt_idx" ON "DecisionAnalysisRun"("decisionId", "createdAt");
CREATE INDEX "AnalysisJob_status_runAfter_idx" ON "AnalysisJob"("status", "runAfter");
CREATE INDEX "AnalysisJob_decisionId_status_idx" ON "AnalysisJob"("decisionId", "status");
CREATE INDEX "AnalysisJob_userId_createdAt_idx" ON "AnalysisJob"("userId", "createdAt");
CREATE INDEX "AnalysisRequest_userId_createdAt_idx" ON "AnalysisRequest"("userId", "createdAt");

-- Backfill existing current analyses into history
INSERT INTO "DecisionAnalysisRun" (
    "id",
    "decisionId",
    "category",
    "cognitiveBiases",
    "missedAlternatives",
    "summary",
    "risks",
    "reflectionQuestions",
    "nextSteps",
    "qualityScore",
    "rawResponse",
    "provider",
    "model",
    "createdAt"
)
SELECT
    'run_' || "id",
    "decisionId",
    "category",
    "cognitiveBiases",
    "missedAlternatives",
    "summary",
    "risks",
    "reflectionQuestions",
    "nextSteps",
    "qualityScore",
    "rawResponse",
    "provider",
    "model",
    "createdAt"
FROM "DecisionAnalysis";

-- AddForeignKey
ALTER TABLE "DecisionAnalysisRun" ADD CONSTRAINT "DecisionAnalysisRun_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisJob" ADD CONSTRAINT "AnalysisJob_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisJob" ADD CONSTRAINT "AnalysisJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisRequest" ADD CONSTRAINT "AnalysisRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
