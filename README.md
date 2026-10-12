# AI Tileset Studio — 当前开发基线

步骤02工程基础与步骤03领域/像素处理及联合复审修复已发布。受审修复源码为 `aad1f72`，已完成main源码检查点为 `9fb02c9`；独立复审PASS、候选及该main CI成功。已发布 main 仍为步骤02–03基线。步骤04 Compiler 已在本地独立技术 Review PASS，随后用户阶段验收补齐。步骤05本地候选 `c09027f` 已完成独立Review：稳定Pack/Atlas、成功导出内容和验收材料获得独立支持；总体 **REQUIRES_REVISION / CHANGES_REQUESTED**，存在1个阻断P2（未拥有暂存目录被失败清理）。本步MZ实机仍NOT_EXECUTED，须整改、独立复审、实机验收和用户批准；没有合并或推送，不宣称完整Studio/真实AI已实现。

当前本地交接：[步骤05独立审查](docs/reviews/step-05-independent-review.md)、[认可项与待整改状态](docs/engineering/STEP_05_BASELINE.md#独立审查检查点2026-10-13)、[冻结时Coding报告](docs/reviews/step-05-coding.md)、[两类MZ验收](docs/step-05/mz-acceptance.md)。步骤06未启动。

已发布基线入口：[发布与仓库维护](docs/orchestration/pre-step-04-repository-maintenance.md)、[需求证据映射](docs/engineering/V1_REQUIREMENTS_EVIDENCE.md)、[最新独立复审](docs/reviews/steps-02-03-global-rereview-aad1f72.md)。正式范围仍以保留的[产品方案](docs/plans/01_PRODUCT_TECH_SPEC_V0.5.md)及[十步计划](docs/plans/02_V1_IMPLEMENTATION_PLAN.md)为准。

## 保留的步骤01诊断原型

Node `22.21.1`、pnpm `10.20.0`。原型业务和 `pnpm build:prototype` 不需要 AI、Web 或数据库；完整工作区检查须先生成Prisma Client。

```sh
pnpm install --frozen-lockfile
pnpm db:generate
pnpm check
# 编译产物要求源码/母版已提交且 Git 工作树干净
pnpm prototype
```

`prototype` 从已入库的 96×144 RGBA8 母版生成两套 768×576 A1/A2：
编号诊断与原始像素美术。结果在 `artifacts/step01-<identity>/`，打印构建 ID、
源码 commit 和 SHA-256。相同身份拒绝覆盖；新代码提交生成新目录。
原型只做固定槽位复制，不是步骤 04 正式 Compiler 或步骤 05 Pack Assembly。

```sh
# 下列路径请换成本机正版 MZ 1.10.0 的 newdata 和上一步打印的构建目录
pnpm verify:mz "/path/to/newdata/js/rmmz_core.js" "/path/to/artifacts/step01-..."
pnpm prepare:mz "/path/to/newdata" "/path/to/artifacts/step01-..."
```

`verify:mz` 执行未修改的正版 Tilemap 选图方法，穷举两个草地/两个水面槽位的
48 形态和 4 播放状态，并逐像素对照独立母版、核对 241 个更新计数。
它属于 Node 原生规则对照，不能代替编辑器和游戏测试。

`prepare:mz` 只在全新的 `.local/mz/<buildId>/` 创建正版模板测试工程，不接受任意
目标路径、不覆盖旧工程或手绘地图、不重新分发正版运行时。
Map001 是程序指定形态；Map002/003 留空供实际编辑器手绘。
完整操作见 [MZ 实机验收](docs/step-01/mz-acceptance.md)。

`pnpm fixtures` 可复现原始母版，**正常测试不会重生成母版**。修改美术脚本后
需要显式审查 PNG 差异与来源清单。原始图片为项目原创、CC0-1.0；未使用第三方 RTP
图块或付费模型。美术母版是兼容性样例，用户视觉确认单独记录。

技术契约：[Target Profile](docs/step-01/target-profile-v1.md)、
[Pixel Contract](docs/step-01/pixel-processing-contract-v1.md)、
[研究记录](docs/step-01/research.md)。最终候选与门禁见
[步骤报告](docs/reviews/step-01.md)。

# 正式工程入口（步骤 02）

Node 22.21.1 / pnpm 10.20.0。安装：`pnpm install --frozen-lockfile`；独立 PostgreSQL：`pnpm db:local init`；然后 `pnpm db:generate`、`pnpm build`、`pnpm db:migrate`。开发执行 `pnpm dev`；生产执行 `pnpm start`。统一检查：`pnpm check`，另执行 `pnpm test:integration` 和两种模式的浏览器测试。完整命令、边界与环境说明见 [工程基线](docs/engineering/STEP_02_BASELINE.md)，需求覆盖见 [要求证据映射](docs/engineering/V1_REQUIREMENTS_EVIDENCE.md)。

这是项目保存与 Pixi 画布工程壳；素材工作流和 AI 尚未开放。以下步骤 01 原型及证据全部保留，原装 Native MZ Host 验收仍未执行。

统一开发/生产启动需要按[步骤02工程基线](docs/engineering/STEP_02_BASELINE.md)配置私有.env及独立PostgreSQL。干净Git检出不包含凭据；已有数据库和验收目录保留原位，不自动搬迁或复用。新环境使用现有db:local脚本时应确认空闲专属端口（TILESET_PG_PORT），初始化拒绝已有.env/.local/postgres。原装Native MZ Host、Map003(4,10)及其他延期事项见维护记录。
