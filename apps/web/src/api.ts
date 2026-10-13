import {
  CreateProjectSchema,
  ErrorSchema,
  ProjectListSchema,
  ProjectSchema,
  WRITE_HEADER,
  WRITE_HEADER_VALUE,
  StudioSchema,
  BuildDetailSchema,
  type CreateProject,
} from '@tileset/contracts';
export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}
export function responseError(response: Response, body: unknown) {
  const parsed = ErrorSchema.safeParse(body);
  return new HttpError(
    parsed.success
      ? `${parsed.data.error.message}${parsed.data.error.diagnostic ? ` ${parsed.data.error.diagnostic.location}：${parsed.data.error.diagnostic.recovery}` : ''}`
      : '本地服务暂时无法完成请求。',
    response.status,
    parsed.success ? parsed.data.error.code : undefined,
  );
}
export async function request(
  path: string,
  input?: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetch(
    path,
    input !== undefined
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', [WRITE_HEADER]: WRITE_HEADER_VALUE },
          body: JSON.stringify(input),
          ...(signal ? { signal } : {}),
        }
      : signal
        ? { signal }
        : undefined,
  );
  const body: unknown = await response.json();
  if (!response.ok) throw responseError(response, body);
  return body;
}
export async function listProjects(signal?: AbortSignal) {
  return ProjectListSchema.parse(await request('/api/projects', undefined, signal)).projects;
}
export async function createProject(input: CreateProject) {
  return ProjectSchema.parse(await request('/api/projects', CreateProjectSchema.parse(input)));
}
export async function studio(id: string, signal?: AbortSignal) {
  return StudioSchema.parse(await request(`/api/projects/${id}/studio`, undefined, signal));
}
export async function preview(
  id: string,
  build: string,
  scene: string,
  group: string,
  signal?: AbortSignal,
) {
  return BuildDetailSchema.parse(
    await request(
      `/api/projects/${id}/builds/${build}/preview?scene=${scene}${group ? `&group=${encodeURIComponent(group)}` : ''}`,
      undefined,
      signal,
    ),
  );
}
export async function upload(id: string, component: string, density: number, file: File) {
  const response = await fetch(
    `/api/projects/${id}/sources/${component}/upload?density=${density}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'image/png', [WRITE_HEADER]: WRITE_HEADER_VALUE },
      body: file,
    },
  );
  const body: unknown = await response.json();
  if (!response.ok) {
    const e = ErrorSchema.parse(body).error;
    throw new Error(`${e.message} ${e.diagnostic?.location ?? ''} ${e.diagnostic?.recovery ?? ''}`);
  }
  return body;
}
