# AI Tileset Studio 开发约束

正式基线：完整阅读 docs/plans/01_PRODUCT_TECH_SPEC_V0.5.md 与
docs/plans/02_V1_IMPLEMENTATION_PLAN.md。保留两份文件。

当前仅授权步骤 01。步骤 02–10 必须等用户批准明确的候选 commit 和构建后才开始。
当前目录是独立 TypeScript 原型；不创建正式 Monorepo、Web、数据库、AI Gateway、
槽位分配器或持久化服务，不调用任何付费模型。

- src/profile.ts 拥有此次实验唯一的候选槽位/版本/动画时基；状态不得冒充实机冻结。
- src/compiler.ts 只将合格的 96×144 源样板放入固定诊断布局；不做生产槽位规划。
- src/pixels.ts 拥有步骤 01 所需最小像素规范；不依赖 Web/ORM/供应商。
- scripts/make-fixtures.ts 是独立创作诊断和美术母版，不从编译器生成期望值。
- verify-mz 使用本机正版未修改核心脚本作外部 oracle；不得把相同实现的自测当独立验证。
- 构建绑定源码 commit、Profile、契约和逐文件 SHA-256。发布目录拒绝覆盖。
- 后续实机证据保存为独立记录，引用构建；不修改已发布的 manifest 来加 PASS。
- STRUCTURAL_PASS、视觉确认、编辑器手绘、游戏动画、独立 Review、用户批准分别记录。
- 未执行写 NOT_EXECUTED。必要门禁缺证据时步骤 BLOCKED，不继续下一编号步骤。
- 不得删失败用例/降低阈值/重置母版来掩盖问题。修改候选后按影响重新验证。
- Coding → 自动测试 → 独立 Agent Review → 修复 → 复测 → 用户 Review。
- 不推送、不合并、不覆盖远端分支；提交只在本地 codex/ 分支进行。
- .local/ 中正版 MZ 项目及 runtime 不入库、不对外发布。已有用户工程不可覆盖。
