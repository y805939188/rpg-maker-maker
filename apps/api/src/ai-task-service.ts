import { composeTaskSnapshot } from '@tileset/ai-gateway';
import type { PromptRequest, TaskSnapshot, DefaultModelConfiguration } from '@tileset/ai-gateway';
import type { Persistence } from '@tileset/persistence';
/** Application owns controlled asset IDs and durable task creation. No URL/path input. */
export class AiTaskService {
  constructor(
    private readonly store: Persistence,
    private readonly target: TaskSnapshot['targetProfile'],
    private readonly defaults?: DefaultModelConfiguration,
  ) {}
  async create(projectId: string, request: PromptRequest, referenceAssetId?: string) {
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
    }
    await this.store.projectSnapshot(projectId);
    return this.store.createTask(
      projectId,
      composeTaskSnapshot(
        request,
        { id: this.target.id, version: this.target.version },
        references,
        this.defaults,
      ),
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
