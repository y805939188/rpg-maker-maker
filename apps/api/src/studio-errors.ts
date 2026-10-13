import { Prisma } from '@prisma/client';
import { HttpException } from '@nestjs/common';
import { AssetError } from '@tileset/asset-core';
import { CompilationError } from '@tileset/mz-compiler';
import { ZodError } from 'zod';
import type { Diagnostic } from '@tileset/contracts';
export class StudioError extends HttpException {
  constructor(
    readonly diagnostic: Diagnostic,
    status = 422,
  ) {
    super(diagnostic.message, status);
  }
}
export function failure(cause: unknown, location = '素材'): StudioError {
  if (cause instanceof StudioError) return cause;
  if (cause instanceof Prisma.PrismaClientInitializationError)
    return new StudioError(
      {
        code: 'STORAGE_UNAVAILABLE',
        message: '本地数据库不可用。',
        location: '本地服务',
        recovery: '检查专属 PostgreSQL 与本地服务；成功历史不会替换。',
      },
      503,
    );
  if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2025')
    return new StudioError(
      {
        code: 'NOT_FOUND',
        message: '所选精确版本或构建不存在。',
        location,
        recovery: '刷新项目后重新选择已保存版本。',
      },
      404,
    );
  if (cause instanceof Prisma.PrismaClientKnownRequestError)
    return new StudioError(
      {
        code: 'STORAGE_WRITE_FAILED',
        message: '本地数据库读取或保存失败。',
        location: '持久化',
        recovery: '检查专属数据库服务和磁盘；刷新读取任务状态，上一成功构建不会被半成品替换。',
      },
      503,
    );
  if (
    cause instanceof Error &&
    'code' in cause &&
    ['ENOSPC', 'EACCES', 'EIO', 'EROFS', 'ENOENT'].includes(String(cause.code))
  )
    return new StudioError(
      {
        code: 'ASSET_STORAGE',
        message: '资产文件读取或保存失败。',
        location: '资产存储',
        recovery: '检查项目资产目录的磁盘空间、权限与文件完整性；不要手动覆盖历史文件。',
      },
      503,
    );
  let code =
    cause instanceof AssetError || cause instanceof CompilationError
      ? cause.code
      : cause instanceof ZodError
        ? 'INVALID_REQUEST'
        : 'BUILD_FAILED';
  const m = cause instanceof Error ? cause.message : '';
  if (/conflict|differs from frozen|adoption/i.test(m)) code = 'REVISION_CONFLICT';
  if (/capacity|NEVER_USED|unused slot/i.test(m)) code = 'CAPACITY';
  if (/immutable|retired/i.test(m)) code = 'IMMUTABLE_DEPENDENCY';
  const messages: Record<string, string> = {
    STYLE: '所选组件及合成结果超过 256 色，或不符合风格约束。',
    PALETTE: '组件或合成后的颜色不在所选调色板中。',
    INVALID_REQUEST: '请求字段不符合素材契约。',
    REVISION_CONFLICT: '当前采用版本已改变，请刷新后重新选择配套版本。',
    CAPACITY: '固定槽位已用尽；退役槽位会保留，不能再次分配。',
    IMMUTABLE_DEPENDENCY: '保留的退役素材依赖旧组件，不能修改其历史配套。',
    READ_TIMEOUT: 'PNG 读取超过 5 秒，上传已停止。',
    ENCODED_LIMIT: 'PNG 超过 4 MiB 上传上限。',
    READ_CHUNKS: 'PNG 数据块数量超过上限。',
    PNG_FORMAT: '只支持单图 RGBA8 sRGB PNG。',
    PNG_SIGNATURE: '文件实际格式不是 PNG。',
    HIDDEN_RGB: '透明像素含隐藏颜色，请显式修复后作为新版本导入。',
    DENSITY_BLOCK: '像素不符合所选逻辑密度，请选择正确密度或修复源图。',
    CODEC_TIMEOUT: '图像解码超过 5 秒，子进程已停止。',
    ADAPTER_BUSY: '图像处理槽正在使用，请稍后重试。',
    SOURCE_INVALID: 'PNG 未通过容器、元数据或像素校验。',
    BUILD_FAILED: '素材未通过配方、编译或交付校验，上一成功构建仍可使用。',
  };
  return new StudioError(
    {
      code,
      message: messages[code] ?? `素材校验失败（${code}）。`,
      location,
      recovery:
        '检查定位组件的格式、96×144 尺寸、逻辑密度、≤256 色调色板、遮罩和三源帧；替换为新 revision 后重建。',
    },
    code === 'INVALID_REQUEST' ? 400 : code === 'REVISION_CONFLICT' ? 409 : 422,
  );
}
