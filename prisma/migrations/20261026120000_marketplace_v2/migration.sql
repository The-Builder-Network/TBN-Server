-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('WELCOME_BONUS', 'PURCHASE', 'PURCHASE_REVERSAL', 'RESERVE', 'RELEASE', 'LEAD_FEE', 'ADMIN_CREDIT', 'ADMIN_DEBIT');

-- CreateEnum
CREATE TYPE "CreditRequestReason" AS ENUM ('CUSTOMER_UNREACHABLE', 'WRONG_WORK_TYPE', 'DUPLICATE_SHORTLIST', 'NOT_A_REAL_JOB', 'OTHER');

-- CreateEnum
CREATE TYPE "CreditRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "JobStatus_new" AS ENUM ('ACTIVE', 'HIRED', 'COMPLETED', 'CLOSED', 'EXPIRED');
ALTER TABLE "public"."jobs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "jobs" ALTER COLUMN "status" TYPE "JobStatus_new" USING ("status"::text::"JobStatus_new");
ALTER TYPE "JobStatus" RENAME TO "JobStatus_old";
ALTER TYPE "JobStatus_new" RENAME TO "JobStatus";
DROP TYPE "public"."JobStatus_old";
ALTER TABLE "jobs" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "LeadStatus_new" AS ENUM ('AVAILABLE', 'INTERESTED', 'SHORTLISTED', 'HIRED', 'DECLINED', 'WITHDRAWN', 'NOT_SELECTED', 'EXPIRED');
ALTER TABLE "public"."leads" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "leads" ALTER COLUMN "status" TYPE "LeadStatus_new" USING ("status"::text::"LeadStatus_new");
ALTER TYPE "LeadStatus" RENAME TO "LeadStatus_old";
ALTER TYPE "LeadStatus_new" RENAME TO "LeadStatus";
DROP TYPE "public"."LeadStatus_old";
ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'JOB_INVITE';
ALTER TYPE "NotificationType" ADD VALUE 'INTEREST_DECLINED';
ALTER TYPE "NotificationType" ADD VALUE 'SHORTLISTED';
ALTER TYPE "NotificationType" ADD VALUE 'NOT_SELECTED';
ALTER TYPE "NotificationType" ADD VALUE 'HIRED';
ALTER TYPE "NotificationType" ADD VALUE 'QUOTE_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'JOB_CLOSED';
ALTER TYPE "NotificationType" ADD VALUE 'CREDIT_REQUEST_RESOLVED';
ALTER TYPE "NotificationType" ADD VALUE 'VERIFICATION_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'VERIFICATION_INFO_REQUESTED';

-- AlterEnum
-- Recreate (instead of ADD VALUE) so the new default 'NOT_SUBMITTED' can be used in this same transaction.
CREATE TYPE "VerificationStatus_new" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED', 'INFO_REQUESTED', 'SUSPENDED');
ALTER TABLE "tradesperson_profiles" ALTER COLUMN "verificationStatus" DROP DEFAULT;
ALTER TABLE "tradesperson_profiles" ALTER COLUMN "verificationStatus" TYPE "VerificationStatus_new" USING ("verificationStatus"::text::"VerificationStatus_new");
ALTER TYPE "VerificationStatus" RENAME TO "VerificationStatus_old";
ALTER TYPE "VerificationStatus_new" RENAME TO "VerificationStatus";
DROP TYPE "public"."VerificationStatus_old";

-- DropIndex
DROP INDEX "payments_stripeSessionId_idx";

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "closeReason" TEXT,
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "hiredAt" TIMESTAMP(3),
ADD COLUMN     "hiredTradespersonId" TEXT,
ADD COLUMN     "leadFeeCredits" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "postcodeDistrict" TEXT;

-- AlterTable
ALTER TABLE "lead_credits" ADD COLUMN     "reserved" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "leads" DROP COLUMN "contactedAt",
DROP COLUMN "rejectedAt",
ADD COLUMN     "creditsCharged" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "creditsReserved" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "declinedAt" TIMESTAMP(3),
ADD COLUMN     "dismissedAt" TIMESTAMP(3),
ADD COLUMN     "interestMessage" TEXT,
ADD COLUMN     "invited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "invitedAt" TIMESTAMP(3),
ADD COLUMN     "notSelectedAt" TIMESTAMP(3),
ADD COLUMN     "reviewRequestedAt" TIMESTAMP(3),
ADD COLUMN     "withdrawnAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenReason" TEXT;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "leadFeeCredits" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "tradesperson_profiles" ADD COLUMN     "idDocumentKey" TEXT,
ADD COLUMN     "idDocumentName" TEXT,
ADD COLUMN     "idDocumentUploadedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "verificationNote" TEXT,
ALTER COLUMN "verificationStatus" SET DEFAULT 'NOT_SUBMITTED';

-- AlterTable
ALTER TABLE "tradesperson_services" ALTER COLUMN "tradeSlug" SET NOT NULL,
ALTER COLUMN "tradeSlug" SET DEFAULT '';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "emailVerifyExpiry" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingOptInAt" TIMESTAMP(3),
ADD COLUMN     "notificationsPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "suspensionReason" TEXT,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reservedChange" INTEGER NOT NULL DEFAULT 0,
    "balanceAfter" INTEGER NOT NULL,
    "reservedAfter" INTEGER NOT NULL,
    "leadId" TEXT,
    "paymentId" TEXT,
    "creditRequestId" TEXT,
    "adminId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_requests" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "tradespersonId" TEXT NOT NULL,
    "reason" "CreditRequestReason" NOT NULL,
    "details" TEXT NOT NULL,
    "status" "CreditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "credits" INTEGER NOT NULL,
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_transactions_userId_createdAt_idx" ON "credit_transactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "credit_transactions_leadId_idx" ON "credit_transactions"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_requests_leadId_key" ON "credit_requests"("leadId");

-- CreateIndex
CREATE INDEX "credit_requests_status_createdAt_idx" ON "credit_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_logs_targetType_targetId_idx" ON "admin_audit_logs"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "jobs_expiresAt_idx" ON "jobs"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripePaymentIntentId_key" ON "payments"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "users_accountStatus_idx" ON "users"("accountStatus");

-- AddForeignKey
ALTER TABLE "tradesperson_profiles" ADD CONSTRAINT "tradesperson_profiles_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_hiredTradespersonId_fkey" FOREIGN KEY ("hiredTradespersonId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_requests" ADD CONSTRAINT "credit_requests_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_requests" ADD CONSTRAINT "credit_requests_tradespersonId_fkey" FOREIGN KEY ("tradespersonId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_requests" ADD CONSTRAINT "credit_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
