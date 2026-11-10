ALTER TABLE "User"
  ADD COLUMN "staffNumber" TEXT,
  ADD COLUMN "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "lastSignInAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_staffNumber_key" ON "User"("staffNumber");

CREATE TABLE "WardAccessRequest" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "staffNumber" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "requestedRole" TEXT NOT NULL,
  "ward" TEXT NOT NULL DEFAULT 'Ward 3D',
  "approverName" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "trainingCompleted" BOOLEAN NOT NULL DEFAULT false,
  "confidentialityAccepted" BOOLEAN NOT NULL DEFAULT false,
  "acceptedAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "grantedRole" TEXT,
  "decisionReason" TEXT,
  "approvedById" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WardAccessRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WardAccessRequest_staffNumber_key" ON "WardAccessRequest"("staffNumber");
CREATE UNIQUE INDEX "WardAccessRequest_email_key" ON "WardAccessRequest"("email");
CREATE INDEX "WardAccessRequest_status_requestedAt_idx" ON "WardAccessRequest"("status", "requestedAt");

CREATE TABLE "WardHandover" (
  "id" TEXT NOT NULL,
  "handoverDate" DATE NOT NULL,
  "shift" TEXT NOT NULL,
  "nurseInChargeId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  "payload" JSONB NOT NULL DEFAULT '{}',
  "formVersion" TEXT NOT NULL DEFAULT '1',
  "outgoingNicId" TEXT,
  "incomingNicId" TEXT,
  "signedOffAt" TIMESTAMP(3),
  "pdfData" BYTEA,
  "pdfGeneratedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WardHandover_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WardHandover_handoverDate_shift_key" ON "WardHandover"("handoverDate", "shift");
CREATE INDEX "WardHandover_status_handoverDate_idx" ON "WardHandover"("status", "handoverDate");

CREATE TABLE "WardAuditEvent" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorEmail" TEXT,
  "action" TEXT NOT NULL,
  "recordId" TEXT,
  "device" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WardAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WardAuditEvent_createdAt_idx" ON "WardAuditEvent"("createdAt");
CREATE INDEX "WardAuditEvent_actorEmail_createdAt_idx" ON "WardAuditEvent"("actorEmail", "createdAt");
CREATE INDEX "WardAuditEvent_recordId_createdAt_idx" ON "WardAuditEvent"("recordId", "createdAt");

CREATE TABLE "WardConfiguration" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WardConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WardConfiguration_key_key" ON "WardConfiguration"("key");

CREATE TABLE "WardSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WardSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WardSession_userId_expiresAt_idx" ON "WardSession"("userId", "expiresAt");
CREATE INDEX "WardSession_expiresAt_idx" ON "WardSession"("expiresAt");
