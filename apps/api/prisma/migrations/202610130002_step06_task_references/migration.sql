-- CreateIndex
CREATE UNIQUE INDEX "LogicalTask_predictionId_key" ON "LogicalTask"("predictionId");

-- AddForeignKey
ALTER TABLE "TaskArtifact" ADD CONSTRAINT "TaskArtifact_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "OriginalAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION tileset_task_monotonic() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."predictionId" IS NOT NULL AND NEW."predictionId" IS DISTINCT FROM OLD."predictionId" THEN RAISE EXCEPTION 'external prediction identity is immutable'; END IF;
  IF OLD."localCancelled" AND NOT NEW."localCancelled" THEN RAISE EXCEPTION 'local cancellation is terminal'; END IF;
  IF OLD."archiveState" = 'DURABLE' AND NEW."archiveState" <> 'DURABLE' THEN RAISE EXCEPTION 'durable archive is immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER monotonic_task BEFORE UPDATE ON "LogicalTask" FOR EACH ROW EXECUTE FUNCTION tileset_task_monotonic();
CREATE FUNCTION tileset_attempt_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.id,NEW."taskId",NEW.sequence,NEW."intentAt") IS DISTINCT FROM (OLD.id,OLD."taskId",OLD.sequence,OLD."intentAt") OR OLD.state <> 'INTENT' THEN RAISE EXCEPTION 'submission attempt is append-only'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER attempt_identity BEFORE UPDATE ON "SubmissionAttempt" FOR EACH ROW EXECUTE FUNCTION tileset_attempt_identity();
