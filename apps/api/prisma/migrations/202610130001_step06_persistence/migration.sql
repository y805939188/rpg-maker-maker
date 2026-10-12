-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "successfulBuildId" TEXT;

-- CreateTable
CREATE TABLE "ProjectSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "adoption" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,

    CONSTRAINT "ProjectSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileObject" (
    "sha256" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "FileObject_pkey" PRIMARY KEY ("sha256")
);

-- CreateTable
CREATE TABLE "OriginalAsset" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "logicalId" TEXT NOT NULL,

    CONSTRAINT "OriginalAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetRevision" (
    "id" TEXT NOT NULL,
    "projectId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "logicalId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "assetId" UUID,
    "sourceSha" TEXT,

    CONSTRAINT "AssetRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionDependency" (
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,

    CONSTRAINT "RevisionDependency_pkey" PRIMARY KEY ("fromId","toId")
);

-- CreateTable
CREATE TABLE "ProcessingRecord" (
    "id" TEXT NOT NULL,
    "projectId" UUID NOT NULL,
    "recipeId" TEXT NOT NULL,
    "irHash" TEXT NOT NULL,
    "descriptor" JSONB NOT NULL,

    CONSTRAINT "ProcessingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pack" (
    "id" TEXT NOT NULL,
    "projectId" UUID NOT NULL,
    "logicalId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "headHash" TEXT,
    "currentBuildId" TEXT,

    CONSTRAINT "Pack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackVersion" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "PackVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotVersion" (
    "packVersionId" TEXT NOT NULL,
    "atlas" TEXT NOT NULL,
    "kind" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "binding" JSONB NOT NULL,

    CONSTRAINT "SlotVersion_pkey" PRIMARY KEY ("packVersionId","atlas","kind")
);

-- CreateTable
CREATE TABLE "Build" (
    "id" TEXT NOT NULL,
    "projectId" UUID NOT NULL,
    "packId" TEXT NOT NULL,
    "projectSnapshotId" TEXT NOT NULL,
    "expectedPackVersion" INTEGER NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "manifestSha" TEXT NOT NULL,
    "directory" TEXT NOT NULL,
    "publication" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Build_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildFile" (
    "buildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,

    CONSTRAINT "BuildFile_pkey" PRIMARY KEY ("buildId","name")
);

-- CreateTable
CREATE TABLE "AcceptanceRecord" (
    "id" UUID NOT NULL,
    "buildId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcceptanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogicalTask" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "projectSnapshotId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL,
    "predictionId" TEXT,
    "archiveState" TEXT NOT NULL DEFAULT 'PENDING',
    "localCancelled" BOOLEAN NOT NULL DEFAULT false,
    "remoteCancellation" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
    "result" JSONB,
    "errorCode" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogicalTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionAttempt" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "predictionId" TEXT,
    "intentAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskArtifact" (
    "taskId" UUID NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "assetId" UUID NOT NULL,
    "revision" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "sourceRef" JSONB NOT NULL,

    CONSTRAINT "TaskArtifact_pkey" PRIMARY KEY ("taskId","ordinal")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSnapshot_projectId_revision_key" ON "ProjectSnapshot"("projectId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "FileObject_key_key" ON "FileObject"("key");

-- CreateIndex
CREATE UNIQUE INDEX "OriginalAsset_projectId_logicalId_key" ON "OriginalAsset"("projectId", "logicalId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetRevision_projectId_kind_logicalId_revision_key" ON "AssetRevision"("projectId", "kind", "logicalId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessingRecord_projectId_irHash_key" ON "ProcessingRecord"("projectId", "irHash");

-- CreateIndex
CREATE UNIQUE INDEX "Pack_currentBuildId_key" ON "Pack"("currentBuildId");

-- CreateIndex
CREATE UNIQUE INDEX "Pack_projectId_logicalId_key" ON "Pack"("projectId", "logicalId");

-- CreateIndex
CREATE UNIQUE INDEX "PackVersion_packId_version_key" ON "PackVersion"("packId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Build_directory_key" ON "Build"("directory");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionAttempt_taskId_sequence_key" ON "SubmissionAttempt"("taskId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "Project_successfulBuildId_key" ON "Project"("successfulBuildId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_successfulBuildId_fkey" FOREIGN KEY ("successfulBuildId") REFERENCES "Build"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSnapshot" ADD CONSTRAINT "ProjectSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OriginalAsset" ADD CONSTRAINT "OriginalAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetRevision" ADD CONSTRAINT "AssetRevision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetRevision" ADD CONSTRAINT "AssetRevision_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "OriginalAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetRevision" ADD CONSTRAINT "AssetRevision_sourceSha_fkey" FOREIGN KEY ("sourceSha") REFERENCES "FileObject"("sha256") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionDependency" ADD CONSTRAINT "RevisionDependency_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "AssetRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionDependency" ADD CONSTRAINT "RevisionDependency_toId_fkey" FOREIGN KEY ("toId") REFERENCES "AssetRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessingRecord" ADD CONSTRAINT "ProcessingRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessingRecord" ADD CONSTRAINT "ProcessingRecord_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "AssetRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pack" ADD CONSTRAINT "Pack_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pack" ADD CONSTRAINT "Pack_currentBuildId_fkey" FOREIGN KEY ("currentBuildId") REFERENCES "Build"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackVersion" ADD CONSTRAINT "PackVersion_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Pack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotVersion" ADD CONSTRAINT "SlotVersion_packVersionId_fkey" FOREIGN KEY ("packVersionId") REFERENCES "PackVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Build" ADD CONSTRAINT "Build_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Build" ADD CONSTRAINT "Build_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Pack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Build" ADD CONSTRAINT "Build_projectSnapshotId_fkey" FOREIGN KEY ("projectSnapshotId") REFERENCES "ProjectSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildFile" ADD CONSTRAINT "BuildFile_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildFile" ADD CONSTRAINT "BuildFile_sha256_fkey" FOREIGN KEY ("sha256") REFERENCES "FileObject"("sha256") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcceptanceRecord" ADD CONSTRAINT "AcceptanceRecord_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogicalTask" ADD CONSTRAINT "LogicalTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogicalTask" ADD CONSTRAINT "LogicalTask_projectSnapshotId_fkey" FOREIGN KEY ("projectSnapshotId") REFERENCES "ProjectSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionAttempt" ADD CONSTRAINT "SubmissionAttempt_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "LogicalTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskArtifact" ADD CONSTRAINT "TaskArtifact_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "LogicalTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskArtifact" ADD CONSTRAINT "TaskArtifact_sha256_fkey" FOREIGN KEY ("sha256") REFERENCES "FileObject"("sha256") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Immutable history is protected even when application code accidentally issues an update.
CREATE FUNCTION tileset_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'immutable history'; END $$;
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['ProjectSnapshot','FileObject','OriginalAsset','AssetRevision','RevisionDependency','ProcessingRecord','PackVersion','SlotVersion','Build','BuildFile','AcceptanceRecord','TaskArtifact'] LOOP
    EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION tileset_immutable()', t);
  END LOOP;
END $$;
CREATE FUNCTION tileset_task_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.id,NEW."projectId",NEW."projectSnapshotId",NEW.snapshot,NEW."snapshotHash",NEW."createdAt") IS DISTINCT FROM (OLD.id,OLD."projectId",OLD."projectSnapshotId",OLD.snapshot,OLD."snapshotHash",OLD."createdAt") THEN RAISE EXCEPTION 'immutable task input'; END IF;
  IF NEW.version <> OLD.version + 1 THEN RAISE EXCEPTION 'task version must increment'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER frozen_task BEFORE UPDATE ON "LogicalTask" FOR EACH ROW EXECUTE FUNCTION tileset_task_snapshot();
ALTER TABLE "Project" ADD CHECK (revision >= 0);
ALTER TABLE "Pack" ADD CHECK (version >= 0);
ALTER TABLE "AssetRevision" ADD CHECK (revision > 0), ADD CHECK (kind IN ('source','style','parameters','recipe'));
ALTER TABLE "PackVersion" ADD CHECK (version > 0);
ALTER TABLE "FileObject" ADD CHECK (bytes > 0 AND bytes <= 50331648), ADD CHECK (sha256 ~ '^[a-f0-9]{64}$'), ADD CHECK (key = 'objects/' || sha256);
ALTER TABLE "SlotVersion" ADD CHECK (state IN ('NEVER_USED','ACTIVE','RETIRED'));
ALTER TABLE "Build" ADD CHECK (publication IN ('ADOPTED','HISTORICAL'));
ALTER TABLE "LogicalTask" ADD CHECK (state IN ('CREATED','QUEUED','SUBMITTING','SUBMISSION_UNKNOWN','REMOTE_RUNNING','FETCHING_RESULT','VALIDATING_AND_INGESTING','COMPLETED','FAILED','CANCEL_REQUESTED','CANCELLED_LOCAL')),
  ADD CHECK ("archiveState" IN ('PENDING','REMOTE_SUCCEEDED','INGESTING','RETRY_REQUIRED','DURABLE')),
  ADD CHECK (state NOT IN ('REMOTE_RUNNING','FETCHING_RESULT','VALIDATING_AND_INGESTING','COMPLETED') OR "predictionId" IS NOT NULL),
  ADD CHECK (state <> 'COMPLETED' OR "archiveState" = 'DURABLE');
ALTER TABLE "SubmissionAttempt" ADD CHECK (state IN ('INTENT','KNOWN','UNKNOWN','REJECTED'));
CREATE FUNCTION tileset_success_pointer() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'Project' THEN
  IF NEW."successfulBuildId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Build" WHERE id=NEW."successfulBuildId" AND "projectId"=NEW.id AND publication='ADOPTED') THEN RAISE EXCEPTION 'invalid project build'; END IF; END IF;
  IF TG_TABLE_NAME = 'Pack' THEN
  IF NEW."currentBuildId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Build" WHERE id=NEW."currentBuildId" AND "packId"=NEW.id AND publication='ADOPTED') THEN RAISE EXCEPTION 'invalid pack build'; END IF; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER project_pointer BEFORE UPDATE ON "Project" FOR EACH ROW EXECUTE FUNCTION tileset_success_pointer();
CREATE TRIGGER pack_pointer BEFORE UPDATE ON "Pack" FOR EACH ROW EXECUTE FUNCTION tileset_success_pointer();
