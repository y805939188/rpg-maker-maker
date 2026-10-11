# 步骤 01 阶段性放行记录

日期：2026-10-12（Asia/Shanghai）。授权来源：本轮用户《Steps 02–03 Autonomous Development Orchestrator》指令。

**PHASE_EXIT_APPROVED_BY_USER**：允许以原生 MZ 核心 + 升级版 NW.js Host 的已有验证作为阶段性兼容基线进入步骤 02。本记录不宣布完整原装 Host 验收或全部手工验收通过。

- 批准代码：`432ffdef8d18e13950b14f290de3ae4f2f83aacd`。
- 批准构建：`step01-56368269c8328e0f84b9`。
- Manifest SHA-256：`1be77467ae7d5fab2c574dce1918d3c4a9a4b54b64a7beda0a42e89c8461351b`。
- 核查时 HEAD：`5e32604c00d20b4f08e9a4905f660f1c854a415f`。受测候选后的三个提交仅补文档、Profile UI 定位说明与验收证据；src、scripts、tests、依赖锁文件无变化。既有 Review 的代码适用性没有扩展至未经审查的新实现。
- Profile：`mz-native-ground-water / 1.0.0-candidate.1`；Pixel Contract：`rgba8-srgb-integer-v1`。机器 Profile 与不可变 Manifest 保留原状态，不改写为全面实机冻结。

用户在本轮报告：原生 MZ 核心 1.10.0、PixiJS 5.3.12、无影响图块行为的插件、NW.js 0.117.0、Chromium 154.0.8037.58；已验证部分草地/水面形态、L 形通道显示及 Map002 保存数据。以上属于 **USER_REPORTED**，不得冒充 Orchestrator 本轮亲自实测。

历史自动证据：52/52 测试、Strict typecheck、build、960 次外部原生核心选图检查、2,211,840 像素及 241 update 检查。历史独立复审见 `step-01-p2-independent-review.md` 与 `step-01-plugins-independent-review.md`；已知 Buffer 重叠复制与工程输入预检问题已关闭。本轮在未改代码的 HEAD 上重新运行 typecheck、52/52 test、build，均 exit 0；原构建 Manifest 与四 PNG 哈希与归档一致。

延期验收：

| 项目 | 状态 | 关闭期限/条件 |
|---|---|---|
| Original Native MZ Host Compatibility | NOT_EXECUTED | V1.0 发布必要条件，最迟步骤 10 正式验收关闭 |
| Map003 `(4,10)` 手工保存及证据复核 | PENDING_USER_EVIDENCE | 后续真实 MZ 验收阶段；不伪造已保存结果 |
| 其他未有逐项证据的完整绘图、动画、通行与美术验收 | NOT_EXECUTED_OR_PARTIAL_USER_REPORTED | 后续相应实机验收；本次仅调整阶段退出门禁 |

用户明确允许步骤 02、03 自动开发、独立复审与技术门禁满足后合并推送。自动验收必须标记 `APPROVED_BY_PREAUTHORIZED_ORCHESTRATOR`。步骤 04 未授权；步骤 03 发布后停止。两份正式 plans、全部历史 Review、构建和 `.local` 人工验收成果继续保留。
