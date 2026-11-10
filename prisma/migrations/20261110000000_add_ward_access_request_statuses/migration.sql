CREATE TYPE "WardAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

ALTER TABLE "WardAccessRequest"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "WardAccessRequestStatus"
    USING "status"::"WardAccessRequestStatus",
  ALTER COLUMN "status" SET DEFAULT 'PENDING';
