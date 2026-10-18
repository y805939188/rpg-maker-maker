import { composeTaskSnapshot, DEFAULT_MODELS, freezeTaskSnapshot } from '@tileset/ai-gateway';
import { RawSource, fingerprint } from '@tileset/asset-core';
import { resizeNearest, prepareReferenceV2 } from '@tileset/material-processing';
import { encodePng, decodeSource } from '@tileset/image-adapter';
import type { PromptRequest, TaskSnapshot, DefaultModelConfiguration } from '@tileset/ai-gateway';
import type { Persistence } from '@tileset/persistence';
/** Application owns controlled asset IDs and durable task creation. No URL/path input. */
export class AiTaskService {
  constructor(
    private readonly store: Persistence,
    private readonly target: TaskSnapshot['targetProfile'],
    private readonly defaults?: DefaultModelConfiguration,
  ) {}
  async create(
    projectId: string,
    request: PromptRequest,
    referenceAssetId?: string,
    context: Record<string, string> = {},
  ) {
    const references: TaskSnapshot['references'][number][] = [];
    if (referenceAssetId) {
      const row = await this.store.db.assetRevision.findUniqueOrThrow({
        where: { id: referenceAssetId },
      });
      if (row.projectId !== projectId || row.kind !== 'source' || !row.assetId || !row.sourceSha)
        throw Error('REFERENCE_ASSET');
      const source = await this.store.readSource(row.id);
      if (source.raw.encoding !== 'png') throw Error('REFERENCE_PNG_REQUIRED');
      references.push({
        assetId: row.assetId,
        revision: String(row.revision),
        sha256: row.sourceSha,
      });
      if (
        request.operation === 'IMAGE_EDIT' &&
        (this.defaults ?? DEFAULT_MODELS).imageEditReferencePreparation
      ) {
        const preparation = (this.defaults ?? DEFAULT_MODELS).imageEditReferencePreparation!;
        const pixels =
          preparation === 'center-crop-square-nearest-v2'
            ? prepareReferenceV2(source.image)
            : resizeNearest(source.image, {
                width: 256,
                height: 256,
                method: 'nearest-explicit',
              });
        const bytes = await encodePng(pixels);
        const prepared = await decodeSource(
          new RawSource({
            id: `r${fingerprint({ original: source.ref, preparation, width: 256, height: 256 }).slice(0, 63)}`,
            revision: 1,
            role: source.raw.role,
            density: 1,
            encoding: 'png',
            bytes,
            provenance: {
              origin: 'deterministic',
              author: 'AI Tileset Studio reference preparation',
              license: source.raw.provenance.license,
              toolVersion: preparation,
              parents: [source.ref],
            },
          }),
        );
        if (prepared.status !== 'validated') throw Error('REFERENCE_PREPARATION_INVALID');
        const preparedId = await this.store.saveSource(projectId, prepared.source);
        const preparedRow = await this.store.db.assetRevision.findUniqueOrThrow({
          where: { id: preparedId },
        });
        if (!preparedRow.assetId || !preparedRow.sourceSha)
          throw Error('REFERENCE_PREPARATION_INVALID');
        references.push({
          assetId: preparedRow.assetId,
          revision: String(preparedRow.revision),
          sha256: preparedRow.sourceSha,
        });
      }
    }
    await this.store.projectSnapshot(projectId);
    const snapshot = composeTaskSnapshot(
      request,
      { id: this.target.id, version: this.target.version },
      references,
      this.defaults,
    );
    return this.store.createTask(
      projectId,
      freezeTaskSnapshot({
        ...snapshot,
        structuredParameters: { ...snapshot.structuredParameters, ...context },
      }),
    );
  }
  async referenceBytes(
    projectId: string,
    reference: TaskSnapshot['references'][number],
    signal: AbortSignal,
  ) {
    signal.throwIfAborted();
    const row = await this.store.db.assetRevision.findFirstOrThrow({
      where: {
        projectId,
        assetId: reference.assetId,
        revision: Number(reference.revision),
        sourceSha: reference.sha256,
        kind: 'source',
      },
    });
    const source = await this.store.readSource(row.id);
    signal.throwIfAborted();
    return source.raw.bytes();
  }
}
