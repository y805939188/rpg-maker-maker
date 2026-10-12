import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { WriteGate } from '@tileset/persistence';
import { PrismaClient, type Project as StoredProject } from '@prisma/client';
import {
  CreateProjectSchema,
  HealthSchema,
  ProjectIdSchema,
  ProjectListSchema,
  ProjectSchema,
  createOpenApiDocument,
  type Project,
} from '@tileset/contracts';

export function toProject(project: StoredProject): Project {
  return ProjectSchema.parse({
    id: project.id,
    name: project.name,
    createdAt: project.createdAt.toISOString(),
  });
}
@Controller('api')
export class ProjectsController {
  constructor(
    @Inject(PrismaClient) private readonly db: PrismaClient,
    @Inject(WriteGate) private readonly gate: WriteGate,
  ) {}
  @Get('health') async health() {
    await this.db.$queryRaw`SELECT 1`;
    return HealthSchema.parse({ status: 'ok', database: 'connected', stage: '02' });
  }
  @Get('openapi.json') openapi() {
    return createOpenApiDocument();
  }
  @Get('projects') async list() {
    const projects = await this.db.project.findMany({
      take: 100,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return ProjectListSchema.parse({ projects: projects.map(toProject) });
  }
  @Get('projects/:id') async get(@Param('id') id: string) {
    if (!ProjectIdSchema.safeParse(id).success) throw new BadRequestException();
    const project = await this.db.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException();
    return toProject(project);
  }
  @Post('projects') async create(@Body() input: unknown) {
    const parsed = CreateProjectSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException();
    return toProject(
      await this.gate.write(() => this.db.project.create({ data: { name: parsed.data.name } })),
    );
  }
}
