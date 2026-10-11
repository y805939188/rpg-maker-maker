# 步骤 01 — 实际交付与 Review 报告

记录日期：2026-10-11，Asia/Shanghai。

**状态：BLOCKED（等待 MZ 实机验收与用户 Review）。**
步骤 01 的独立原型、候选契约、自动测试及独立代码 Review 已完成；
必要的原生编辑器绘图/实际游戏与人工美术门禁尚未执行，不能宣称步骤 01 通过。
未开始步骤 02–10，也未调用付费模型、推送或合并远端。

## 候选身份

| 项目 | 值 |
|---|---|
| 分支 | `codex/step-01-mz-prototype` |
| **受测代码 Commit** | `301d3cdb37743a53eff6046ccf2b23aea0ab8122` |
| 不可变构建 ID | `step01-ffc5300c7fb2cb94a48a` |
| Target Profile | `mz-native-ground-water / 1.0.0-candidate.1`，尚未实机冻结 |
| Pixel Contract | `rgba8-srgb-integer-v1` |
| 母版来源版本 | `original-fixtures-v1.1`，原创 CC0 像素图，非 AI/第三方 RTP |
| Compiler | `fixed-prototype-v1`，固定诊断放置原型 |
| MZ 目标 | 编辑器/模板核心 1.10.0，Area Type、48px、无插件 |
| 环境 | Node 22.21.1、pnpm 10.20.0、TypeScript 5.9.3、Sharp 0.34.5、Vitest 4.0.18 |
| Manifest SHA-256 | `211790adf8aa421df3c0d525653141dbb4f545ddf1e9e83001199124e22c110a` |

本报告及证据以**后续文档提交**入库；这不改变上面的受测代码或已发布构建。
后续 MZ 证据必须引用此身份，保存在新的独立记录中，不修改已有 manifest。

## 验证状态分别记录

| 门禁 | 实际状态 | 能证明什么 |
|---|---|---|
| 代码实现 | COMPLETE | 本步独立原型与验收准备已实现 |
| 类型/单元测试/构建 | PASS | 15 个源测试及 TypeScript Strict 检查 |
| 图集结构 | STRUCTURAL_PASS | 尺寸、固定地址、三源帧、像素保留、空区域 |
| 原生脚本选图/像素/更新计数 | PASS | 未修改 Tilemap 在 Node VM 的规则；不包含 GPU |
| 独立代码 Review | PASS | 绑定候选的独立反例、复审与问题修复 |
| 指定形态的真实 MZ 渲染 | NOT_EXECUTED | CPU montage 不能代替实际 MZ 渲染 |
| 原生编辑器正常手绘 | NOT_EXECUTED | 尚无由编辑器保存的手绘地图 |
| 实际游戏动画/通行 | NOT_EXECUTED | 尚未在原生 NW.js/MZ 游戏内执行 |
| 人工美术母版确认 | NOT_EXECUTED | AI Reviewer 看过 CPU 拼装图，未替代人工确认 |
| Profile 实机冻结 | NOT_EXECUTED | 保持 candidate 状态 |
| 用户最终批准 | NOT_EXECUTED | 「continue」只继续当前步骤，不解除下一步门禁 |

不可变 manifest 内的后续验证字段保持发布时 NOT_EXECUTED。
当前 PASS 证据由本报告、独立 Review 和外部 JSON 记录补充，不重新写入构建文件。

## 实现范围与关键文件

- [Profile](../step-01/target-profile-v1.md) / `src/profile.ts`：精确候选槽位、容量、Tile ID、
  版本、模式、通行和动画规则。草地 kind16/17，水面 Block D kind4/6；容量各2。
- [Pixel Contract](../step-01/pixel-processing-contract-v1.md) / `src/pixels.ts`：
  RGBA8/sRGB、整数裁切、最近邻、Alpha约束及PNG真实容器检查；拒绝不合格输入。
- `src/compiler.ts`：从96×144源样板编译固定A1/A2布局；不依赖后端/数据库/模型。
- `scripts/make-fixtures.ts`、`tests/fixtures/`：独立编号/方向/角落/F0–F2诊断图、
  原创草地/水面/静态岸线遮罩及来源清单；正常测试不重生成期望值。
- `scripts/build-prototype.ts`：源码commit/源哈希/锁文件/编码环境绑定的实验构建，
  独占锁、暂存目录、单次rename发布，已有构建拒绝覆盖。
- `scripts/mz-oracle.ts`、`scripts/verify-mz.ts`：运行本机正版原始Tilemap作外部对照；
  不在复制型编译器里重写一套形态表自证。
- `scripts/prepare-mz.ts`：从正版模板组装全新本地测试工程，含NW启动配置、
  空插件、推荐数据库设置、程序指定形态地图与两张待手绘空白地图。
- [研究记录](../step-01/research.md)、[操作指导](../step-01/mz-acceptance.md)、
  [记录模板](../step-01/acceptance-record.template.json)、AGENTS.md、README.md。

岸线唯一候选是**水格内不透明预合成配套草岸**：静态草岸/沙边/暗水边由同一遮罩
固定，内部波纹变化。没有证明任意混搭、透明多层、瀑布等方案，也没有把这些加入范围。
正式 IR/处理配方、Fragment、Pack分配/退役、任务/持久化、Studio/浏览器播放属于后续步骤。

两份批准方案保持不变。完整阅读后，V0.0工作流B按执行计划归步骤02，未提前搭建。

## 自动检查与真实证据

最终候选在 `2026-10-11T22:10:39+08:00` 开始记录的检查：

| 命令 | 真实结果 |
|---|---|
| `pnpm install --frozen-lockfile` | exit0；Reviewer在最终候选亲自安装 |
| `pnpm typecheck` | exit0 |
| `pnpm test` | exit0，1个源文件，15/15；dist不再重复执行 |
| `pnpm build` | exit0，独立CLI可运行 |
| `pnpm prototype` | 初次exit0；后续3次对同身份预期exit1拒绝覆盖，5文件哈希不变 |
| `pnpm verify:mz '<正版newdata>/js/rmmz_core.js' artifacts/step01-ffc5300c7fb2cb94a48a` | exit0；48索引、960图块状态、2,211,840像素、241更新计数 |
| `pnpm prepare:mz '<正版newdata>' artifacts/step01-ffc5300c7fb2cb94a48a` | 初次exit0；重复EEXIST，639文件前后哈希不变 |
| 独立PNG线格式反例 | 正常RGBA8接受；索引/APNG/gAMA/HDR与IHDR/IDAT/IEND坏CRC全部明确拒绝 |
| 独立像素/渲染检查 | 5×3456个逻辑2×2块零错误；3056静态岸像素零漂移，10768内部像素变化；48形态CPU渲染，帧1=状态3 |
| 新MZ工程静态依赖检查 | 50项入口/JS/WASM/字体/角色/音效/地图/图集存在，六core与正版哈希相同；**不是运行PASS** |
| ZIP交付包校验 | ZIP CRC、manifest原文、全部源图和图集SHA-256一致 |

具体stdout/JSON/probe快照：
[证据目录](../evidence/step-01/step01-ffc5300c7fb2cb94a48a/automatic-checks.json)。
目录内 `evidence-hashes.json` 记录所有证据快照哈希。
独立脚本原样归档到 `independent-probes/`；复制回仓库 `.local/reviewer/` 后可按
独立报告的命令复现，需要本机正版MZ模板。它们不向仓库重新分发原生核心代码。

## 构建产物

本地构建目录：
`/Users/dingshinn/Desktop/rpg-maker-maker/artifacts/step01-ffc5300c7fb2cb94a48a/`

| 产物 | SHA-256 |
|---|---|
| diagnostic_A1.png | `de08f8bc36b87017afbb62aba946d612e8f4536939c0db707bbbbcbfd93b337f` |
| diagnostic_A2.png | `b493ecc86e938dc9aa4f389ba6b1b052222baeade6bb1d58dea7b003126330cd` |
| art_A1.png | `d896c5c8b62816e844865b2abe12a0d5c1694aceb6cd3c75f93eccbd6c55d9d2` |
| art_A2.png | `7d60ac8c6072d38736e4027cc25fa23979de6e400b9c66d4f586a108506b2b2b` |

验收素材ZIP（25项，55,630字节；原创源/图集、契约、指导和CPU预览，**不包含正版runtime/RTP**）：
`/Users/dingshinn/Desktop/rpg-maker-maker/.local/delivery/step01-ffc5300c7fb2cb94a48a-acceptance.zip`

ZIP SHA-256：`4fbe16d13479a2f1011dbc1e30e65dca945c9a03d3f18369dd4532296428f076`。

已准备的本机正版测试工程：
`/Users/dingshinn/Desktop/rpg-maker-maker/.local/mz/step01-ffc5300c7fb2cb94a48a/game.rmmzproject`

Map001为程序指定48形态；Map002/003目前为空白，**不属于手绘验收证据**。
core、launcher、图集引用及初始地图哈希另存于项目reference/待验收记录中。

## 独立 Review 与修复

独立 Reviewer `/root/step01_independent_review` 未参与实现。
[初审](step-01-independent-initial.md)：CHANGES_REQUESTED，绑定85e6e71旧候选。
[最终复审](step-01-independent-final.md)：**代码PASS**，绑定301d3cd与最终构建。

已修复：Sharp metadata接受索引/APNG/非sRGB Gamma；遗漏HDR色彩块和宽松CRC；
并发属性插入造成身份不稳定；凹角1px绘制违反逻辑2px；dist测试重复；新工程缺NW
launcher和菜单脸图。保留原失败用例，新增真实反例，没有降低阈值。
母版以v1.1显式更新，所有最终验证重新绑定；旧构建保留且不复用为新候选PASS。

## 尚未关闭的门禁与需要用户完成的操作

MZ UI连接多次返回 `-10005 timeoutReached / noWindowsAvailable`，库存读取也在30s
超时并重置。未成功操作本候选工程，因此真实MZ验证全部为NOT_EXECUTED。
不能因本机已安装MZ或原生脚本测试通过而取消必要实机门禁。

请按 [完整实机指导](../step-01/mz-acceptance.md) 在上面**指定的新工程**执行：

1. 核对MZ1.10.0、Area Type、48px、A1/A2和两个草/水槽位、推荐通行属性。
2. 查看Map001指定形态，再在Map002/003用普通画笔画孤立格、池塘长边/内外角/孔洞、
   一格通道、对角接触和大面积区域；保存原始手绘地图，保留用于步骤05。
3. 测试游戏：观察0→1→2→1三源水面、静态岸线、草可走/水不可走；留录像或
   多状态截图加观察记录。人工确认美术母版；没有执行的子项仍记NOT_EXECUTED。
4. 返回Map002/003文件及对应截图/录像、MZ版本、逐项结果和意见。后续由Agent
   计算哈希并保存新的外部验收记录，引用本构建，不改其manifest。
5. 技术门禁补齐后，由用户明确批准此候选；在批准前保持步骤01，不进入步骤02。

非阻断已知限制：本步容量仅2对；输入严格收窄为完整基本样板；像素母版不代表后续
AI高质量指标。更广输入、生产模块及质量评测按批准步骤实施。
没有发现需要改变已批准兼容范围或降低验收门槛的问题。
