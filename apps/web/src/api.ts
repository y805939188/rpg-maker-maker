import {
  CreateProjectSchema,
  ErrorSchema,
  ProjectListSchema,
  ProjectSchema,
  WRITE_HEADER,
  WRITE_HEADER_VALUE,
  type CreateProject,
} from '@tileset/contracts';
async function request(path: string, input?: CreateProject): Promise<unknown> {
  const response = await fetch(
    path,
    input
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', [WRITE_HEADER]: WRITE_HEADER_VALUE },
          body: JSON.stringify(CreateProjectSchema.parse(input)),
        }
      : undefined,
  );
  const body: unknown = await response.json();
  if (!response.ok) {
    const parsed = ErrorSchema.safeParse(body);
    throw new Error(parsed.success ? parsed.data.error.message : '本地服务暂时无法完成请求。');
  }
  return body;
}
export async function listProjects() {
  return ProjectListSchema.parse(await request('/api/projects')).projects;
}
export async function createProject(input: CreateProject) {
  return ProjectSchema.parse(await request('/api/projects', input));
}
