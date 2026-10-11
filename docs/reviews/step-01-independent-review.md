# 步骤 01 独立首席技术 Review

审查日期：2026-10-11，Asia/Shanghai。Reviewer：本轮 Independent Principal Reviewer `/root`；并行审查员 `/root/native_rules`、`/root/pixels_tests`、`/root/evidence_package`。本轮审查员均未参与受测实现。

| 结论层次 | 本次结论 |
|---|---|
| 代码及工程 | **REQUIRES_REVISION**：发现当前像素契约的实际缺陷 R1；另有验收入口校验缺陷 R2 |
| 真实 MZ 验收 | **NOT_EXECUTED / BLOCKED**：没有本候选的编辑器手绘、实际游戏及人工美术 PASS 证据 |
| 步骤 01 整体建议 | **REQUIRES_REVISION**；修复后仍须保持 **BLOCKED_PENDING_MZ_ACCEPTANCE**，直到实机证据及用户批准齐全 |

发现 **2 项 P2，无有依据的 P0/P1**。指定构建完整、可复现，图块地址及原生脚本对照正确；两项缺陷不等于当前 PNG 已损坏。代码 Review 与步骤整体验收分别判定。

## 1. Review 对象和受测版本

| 项目 | 核实结果 |
|---|---|
| 仓库 | `/Users/dingshinn/Desktop/rpg-maker-maker` |
| 原工作区分支 | `codex/step-01-mz-prototype` |
| 开始审查时 HEAD | `cf00baa464d9355900e4e7abc386b7a57cdfaa73` |
| **受测提交** | **`301d3cdb37743a53eff6046ccf2b23aea0ab8122`**，存在，提交说明为准备原生 playtest launcher/menu assets |
| 开发前基线 | `e8065e3`；相对本提交新增 34 个文件、2,390 行，包括锁文件、原型、母版和本步文档 |
| 工作区一致性 | 初始 tracked/untracked 状态干净；`301d3cd..HEAD` 只新增 27 个报告/证据文件，实现、测试、锁文件、正式方案和契约无差异 |
| 隔离受测目录 | `.local/independent-review-301d3cd`，detached HEAD 精确为目标 SHA；未切换原分支 |
| Build ID | `step01-ffc5300c7fb2cb94a48a` |
| Profile / Pixel Contract | `1.0.0-candidate.1` / `rgba8-srgb-integer-v1`；Profile 尚未实机冻结 |
| Manifest SHA-256 | `211790adf8aa421df3c0d525653141dbb4f545ddf1e9e83001199124e22c110a` |
| 验证环境 | Node 22.21.1、pnpm 10.20.0、TypeScript 5.9.3、Sharp 0.34.5 / libvips 8.17.3、Vitest 4.0.18 |

原目录既有 `.local/`、`dist/`、`artifacts/` 属忽略内容，因此正式自动检查在重新安装/编译的隔离提交执行。隔离目录最初默认 Node 为 22.14.0；发现后将 22.21.1 放在 PATH 首位，重新安装，以下记录均使用目标环境。没有让旧 dist 或未提交代码参与测试。

## 2. 审查范围及方法

审查代码之前完整阅读产品方案 822 行、十步计划 137 行、Coding 报告 148 行及 MZ 指南 58 行；再逐行阅读 `src/`、`scripts/`、测试、Profile、Pixel Contract、研究记录与来源清单。之前的 Reviewer 报告仅作为参考，本轮重新运行验证、重新检查产物，并新增独立反例。

正式依据是产品 §3、§8、§11、§14 和执行计划步骤 01 的退出条件。未要求提前实现步骤 02–10 的 Monorepo、Web、数据库、AI、IR、正式 Fragment、Pack 分配或持久化服务。未调用付费图像模型。

原生 oracle 使用本机正版 `RPGMZ.app/Contents/Resources/newdata/js/rmmz_core.js`；编辑器 Info.plist 与核心 `Utils.RPGMAKER_VERSION` 均为 1.10.0，核心 SHA-256 与 Profile 的 `4ad828ae6cdd8b526e25591eaffd1ccf5ac4eb753f865f7ff48a0b3c821ff67f` 一致。没有发布或改写正版代码。

本轮新增证据及执行时原样探针保存在 [独立证据目录](/Users/dingshinn/Desktop/rpg-maker-maker/docs/evidence/step-01/independent-review-301d3cd/validation-summary.json)，逐文件哈希在 [hash ledger](/Users/dingshinn/Desktop/rpg-maker-maker/docs/evidence/step-01/independent-review-301d3cd/evidence-hashes.json)。命令索引是 Reviewer 整理的实际结果，不冒充逐字终端日志。

## 3. 已验证的实现和测试

以下命令在隔离目标提交亲自执行。`<正版模板>` 指本机安装的 `newdata`，`<build>` 指隔离目录 `artifacts/step01-ffc5300c7fb2cb94a48a`。

| 命令/诊断 | 实际结果与证明范围 |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0；锁文件可安装。esbuild 生命周期脚本被既有允许清单忽略，实际测试/构建正常 |
| `pnpm typecheck` | exit 0，Strict 类型检查 |
| `pnpm test` | exit 0，1 个源测试文件、15/15，通过；未重复运行 dist 测试 |
| `pnpm build` | exit 0，独立 TypeScript CLI 可编译 |
| `pnpm prototype` | exit 0，**重新产生完全相同 Build ID、manifest 与四图字节哈希** |
| `pnpm verify:mz '<正版模板>/js/rmmz_core.js' '<build>'` | exit 0；960 次组合、2,211,840 像素、241 更新状态，范围限于原生取图/CPU 比较 |
| `pnpm prepare:mz '<正版模板>' '<build>'` | exit 0，在隔离目录生成新的测试工程；六个核心哈希与原件相同 |
| 编译 CLI 重复请求 3 次 | 三次 exit 1，均为预期 `Immutable build already exists`；5 文件哈希不变，无遗留 lock/stage |
| 对原既有工程重复 prepare | exit 1 / EEXIST；639 个文件哈希全部不变，没有覆盖手绘候选工程 |
| 独立邻接语义探针 | 256 邻域对应 47 个普通形态；另测代表图 47；不是编辑器画笔执行 |
| 独立替换源图并用正版选图 | 480 组合、1,105,920 像素通过，不依赖固定编号/美术母版内容 |
| 独立随机合法像素实验 | 150 次 RGBA8 PNG 往返、150 次整数 nearest、500 次 Uint8Array 多行重叠、5 套新合法源编译逐像素通过 |
| Buffer 多行重叠 / 缺文件清单反例 | 均复现实际缺陷，见 R1/R2；未改正式测试或基准 |

四张发布图的重建哈希：

| 文件 | SHA-256 |
|---|---|
| diagnostic_A1.png | `de08f8bc36b87017afbb62aba946d612e8f4536939c0db707bbbbcbfd93b337f` |
| diagnostic_A2.png | `b493ecc86e938dc9aa4f389ba6b1b052222baeade6bb1d58dea7b003126330cd` |
| art_A1.png | `d896c5c8b62816e844865b2abe12a0d5c1694aceb6cd3c75f93eccbd6c55d9d2` |
| art_A2.png | `7d60ac8c6072d38736e4027cc25fa23979de6e400b9c66d4f586a108506b2b2b` |

## 4. 按严重程度排序的问题

### R1 — P2：合法 Buffer 的多行重叠复制会污染来源

**位置：** [src/pixels.ts:113](/Users/dingshinn/Desktop/rpg-maker-maker/src/pixels.ts:113)，`copyRect` 的行快照与写回；遗漏测试位于 [tests/prototype.test.ts:30](/Users/dingshinn/Desktop/rpg-maker-maker/tests/prototype.test.ts:30)。

**触发：** `Pixels.data` 使用合法 `Buffer`（`Buffer instanceof Uint8Array` 为 true），来源和目标共享存储，向下复制多行。

**实际与期望：** Buffer 的 `.slice()` 返回共享视图，第一行写回会改变尚未读取的第二行。1×3 图像红通道原为 `[1,2,3]`；复制前两行至 `dy=1` 后实际 `[1,1,1]`，应为 `[1,1,2]`。相同操作使用普通 Uint8Array 正确。

```js
const p = {
  width: 1, height: 3,
  data: Buffer.from([1,1,1,255, 2,2,2,255, 3,3,3,255])
};
copyRect(p, p, 0, 0, 1, 2, 0, 1);
// 实际红通道 [1,1,1]；期望 [1,1,2]
```

**直接证据：** [buffer-overlap.json](/Users/dingshinn/Desktop/rpg-maker-maker/docs/evidence/step-01/independent-review-301d3cd/pixels-review/buffer-overlap.json) 的 `pass=false`，根 Reviewer 另行执行同一最小反例，结果一致。

**影响：** 违反当前 [Pixel Contract:21](/Users/dingshinn/Desktop/rpg-maker-maker/docs/step-01/pixel-processing-contract-v1.md:21) 已明确承诺的重叠快照，不是需要等步骤 03 才实现的新功能。当前编译器向独立 atlas 缓冲复制，解码也返回新 Uint8Array，因此没有证据表明本次四张 PNG 受影响。

**整改：** 快照时显式分配独立 Uint8Array，不依赖可能被子类覆盖的 `.slice()` 语义；补 Buffer 多行向下重叠及共享存储视图回归。既有单行 Uint8Array 测试保留。

**门禁：** 阻止本轮给予代码 PASS；建议在步骤 01 内修复、复测后关闭。缺陷局限于像素接口边界，不上升为核心图集完全错误的 P0/P1。

### R2 — P2：验收工程入口接受缺少必需图集的清单

**位置：** [scripts/prepare-mz.ts:11](/Users/dingshinn/Desktop/rpg-maker-maker/scripts/prepare-mz.ts:11)，manifest 读取/校验；第 15–18 行只校验已列项，第 26 行只复制已列项，41–44 行却无条件引用四张图片，81–84 行继续写原 Build ID。

**触发：** 在临时目录复制合法构建，从 `manifest.files` 删除 `diagnostic_A2.png` 并删除该 PNG，保留原 profile/buildId。

**实际与期望：** 运行目标提交的 `dist/scripts/prepare-mz.js` **exit 0**，成功输出原 Build ID/projectFile；工程 Tilesets[1] 仍引用 `diagnostic_A2`，实际文件不存在。应在创建工程前明确拒绝缺少必需文件的清单。

**直接证据：** [package-review-result.json](/Users/dingshinn/Desktop/rpg-maker-maker/docs/evidence/step-01/independent-review-301d3cd/package-review-result.json) 的 `missingManifestFileCounterexample`。独立子 Agent 与根 Reviewer 分别复现。变异构建/工程在 TemporaryDirectory 中创建并清理，未改原产物。

**影响：** 损坏或删减清单可绕过入口检查，得到不能完整验收的工程，并继续引用原 buildId。当前指定交付确有四图、哈希正确，此发现不表示真实验收包缺图。

**整改：** 检查精确必需文件集合 `{diagnostic_A1.png, diagnostic_A2.png, art_A1.png, art_A2.png}`、字段类型和哈希格式；缺项在 mkdir/copy 前拒绝。可同时核对 manifest 身份，避免变异清单冒用原 Build ID。添加缺失/空清单的入口反例，不需要引入正式持久化服务。

**门禁：** 对当前完整构建是非阻断 P2；建议本步收尾一并修复。它不会单独使正确现有包变为 FAIL，也不能解除尚缺实机证据的门禁。

## 5. 对 15 项测试和 960 状态的独立判断

**15 项属实：** 9 项像素/PNG 容器测试，5 项编译/母版测试，1 项动画时基测试。包括 Alpha 字节往返、尺寸/缓冲/越界、nearest、原容器 IHDR/ICC/APNG/色彩/CRC、atlas 全像素及空白区、错误帧数/透明源拒绝、母版哈希、静态岸线和 2×2 逻辑密度。断言有实质内容；但多行 Buffer 重叠未覆盖，15 PASS 并不能保证整个像素接口无缺陷。

单元布局期望使用同一 Profile，因此自身不能独立证明 Profile 的地址正确。动画 1,000 次循环断言也重复了候选公式。独立价值来自另行执行、固定哈希的正版 Tilemap，而不是这些自测数量。

`scripts/verify-mz.ts:19–44` 的真实计算为：

```text
2 类素材 × 48 shape ×（2 草槽 × 1 状态 + 2 水槽 × 4 播放状态）= 960
960 × 4 quarters × 24 × 24 = 2,211,840 像素
```

水 state1/state3 都读取源帧 1；去掉重复源选择后为 **768** 个槽位/源帧/shape 组合。两槽也使用相同母版，证明的是两处地址，不是两套独立美术。因此 960 是真实检查次数，但不是 960 个不同邻接形态、源素材或实机测试。

外部核心选图与 source quarter 字节对照，对固定复制原型有独立意义；期望的连接表仍来自该核心，不能推出编辑器邻接选择。新增探针按四象限共边/斜角语义自行枚举 256 邻域，覆盖普通 0–46 共 47 形态，并单独确认 shape47 是代表图。它增强规则分析，仍没有执行 MZ 编辑器。

Golden 母版由 `make-fixtures.ts` 自行绘制，不导入 compiler/Profile，只借用 blank/encode；正常测试不重生成期望值。独立确认 mask 3,056 个静态岸像素三帧不变，F0→F1 有 10,624 个内部像素的 RGBA 改变。Coding 报告的 10,768 是“对三帧任一变化”口径，并非相互矛盾。自动保持不等于人工美术确认。

PNG 探针也发现底层对部分无害 ancillary 异常容错；本轮未发现有效像素改变，未将所有宽松语法处理都扩张为阻断问题。当前实验是严格收窄的源输入子集，不是全量 PNG 验证器。

## 6. MZ 原生兼容性分析

[官方素材标准](https://rpgmakerofficial.com/product/MZ_help-en/01_11_01.html) 确认 A1/A2 768×576、Block D 三个基本样板横排以及 A2 Counter 的特殊桌子行为；[官方图块组设置](https://rpgmakerofficial.com/product/MZ_help-en/01_08_10.html) 定义模式与通行配置。具体版本结论依据本机未修改 1.10.0 核心，而非把公开网页当本产物实机证据。

| 规则 | 独立核实 |
|---|---|
| A2 普通地面 | kind16/17，Tile ID 2816/2864，起点 (0,0)/(96,0)，各 96×144，正确 |
| A1 Block D 普通水面 | kind4/6，Tile ID 2240/2336，起点 (384,0)/(384,144)，各三帧总宽 288，正确 |
| quarter | 原生 `_addAutotile` 取 24×24，目标四象限顺序及源坐标与所有 48 索引一致 |
| 动画 | 本机 core:2327/2500 分别采用 `floor(animationCount/30)` 与 `[0,1,2,1]`；241 个更新状态通过，约 0.5 秒是名义速度 |
| 通行候选 | 草 flags=0、水 flags=15、空 B flags[0]=16；本机 `Game_Map.checkPassage` 的位运算支持建议，实际玩家使用尚未测 |

公开 [Tilemap 源码](https://rpgmakerofficial.com/product/mz/rmmz_api/Tilemap.js.html) 支持 quarter/动画分析。本项目 oracle 执行真正外部核心，stub 只接收 addRect、禁用当前排除的 Table 特性，没有重新实现选图表。但它没有执行 GPU、编辑器或玩家输入。

`compileFixedPrototype` 不旋转、不插值、不缩放，只将合格 96×144 不透明源写入固定地址；新合法源替换实验没有暴露特殊母版依赖。这个简洁边界符合本步。未发现阻碍后续替换正式 Compiler 的结构决策。

岸线唯一候选为 **水格内不透明预合成配套草岸**。三源使用固定边岸/凹角，内部波纹变化；先铺 A2 草再画 A1 水，草岸像素仍归不可走水格。这证明了候选图集与 CPU 取图自洽；尚未证明原生自动层覆写/邻接重算、草地自身边界与水格草岸的实际视觉衔接，或游戏中无接缝/闪动。任意透明叠加、任意混搭与未来 AI 品质均未被证明，当前也未承诺。

## 7. 验收包、测试工程及指南评价

验收 ZIP SHA-256 为 `4fbe16d13479a2f1011dbc1e30e65dca945c9a03d3f18369dd4532296428f076`，25 项、55,630 字节，CRC 全通过；manifest 原文、全部源/来源文件和四输出与目标构建一致，指导/契约与目标提交一致。五张 CPU 预览与既有证据一致；没有正版 runtime/RTP。

既有测试工程六份核心与安装原件字节一致，launcher 存在、插件列表为空，A1/A2、Area Type、48px、flags 及 Map002 (1,1) 起点符合候选。构建/工程 reference/文档快照相互关联，旧证据 hash ledger 的 24 文件与最终 Review 哈希匹配。本轮完整重建进一步排除了只相信开发者记录的问题。

Map001 是 16×12、192 个非零 tile 的程序指定矩阵；Map002/003 是 17×13、各 1,326 个全零 layer 数据，且哈希与 pending 记录相同。它们确实还不是手绘地图。现有记录分别保持 NOT_EXECUTED 是正确的，不能因 ZIP 能解压或新工程能组装改写为 PASS。

[mz-acceptance.md](/Users/dingshinn/Desktop/rpg-maker-maker/docs/step-01/mz-acceptance.md) 的图块/坐标、普通自动层画笔、禁止 Shift、孔洞/撤销重算、游戏与证据要求基本准确。补充使用说明：**工程已准备好时直接打开，不必重跑 prepare**；重跑 EEXIST 是保护行为。Map001 全图和内外角放大图应留证；Map003 游戏测试需要记录临时起点变化，测试后是否还原也应注明。

## 8. 仍需人工执行的验收

本轮工具能枚举到运行中的 `jp.co.kadokawa.rpgmz`，一次读取应用状态返回 **`screen recording not granted`**。因此没有操作候选工程，未反复无期限尝试。以下状态仍全部 NOT_EXECUTED：

| 门禁 | 需要补齐的证据 |
|---|---|
| 指定形态真实渲染 | Map001 原生编辑器/游戏显示、全图及代表内外角截图，注明 shape47 为代表图 |
| 正常编辑器手绘 | Map002 art / Map003 diagnostic，由普通画笔实际创建并保存；两草/水槽、孔洞、通道、对角、大片区域及邻居重算 |
| 实际游戏动画 | 两地图分别运行，诊断 F0→F1→F2→F1 至少两个周期；美术内部变化、岸线固定的录像或多状态截图与观察记录 |
| 通行 | 两草槽可走、两水槽四方向边界不能进入，烘焙草岸仍属阻挡水格 |
| 人工美术 | 草地/岸线衔接、重复/接缝、色彩、波纹/闪动的明确评价，不能用 mask 不变替代 |
| 最终批准 | 用户对确定候选 commit/build 的明确批准 |

请直接打开既有 [测试工程](/Users/dingshinn/Desktop/rpg-maker-maker/.local/mz/step01-ffc5300c7fb2cb94a48a/game.rmmzproject)，按指南执行：

1. 留 MZ About 1.10.0 与数据库截图，核对 Area Type、48px、四图、两草○/两水×、无 Counter/Bush/Star，空 B 为☆。
2. Map002/003 都先用 kind16 铺草；普通自动层画水 kind4：孤立 (3,2)、池塘 x6..12/y2..7、草孔 (9,4)/(9,5)、L 型一格通道及对角 (13,9)/(14,10)。用 kind17/kind6 复核第二槽位区域。扩展、涂回草、撤销再画并保存。
3. 在 Map002 起点开始新游戏，再临时移到 Map003 测诊断；分别录像至少两个周期，并记录通行。不要按 Ctrl 穿透通行测试，不启用插件。
4. 返回 **Map002/003 原始 JSON、数据库/绘图截图、游戏录像或多状态截图+观察记录、操作者/时间/版本、逐项 PASS/FAIL/NOT_EXECUTED 和人工美术意见**。JSON/媒体 SHA-256 可由 Agent 收到后计算；起点/配置变化一并注明。
5. 失败记录地图坐标、kind、预期/实际，保留失败原件。后续记录引用本 build/manifest/PNG 哈希，不修改已发布 manifest 加 PASS；这两张手绘地图须保留用于步骤 05。

## 9. 阻断与非阻断问题

**代码门禁：R1 要先修复并回归，才建议代码 PASS。** R2 当前完整包不触发，属非阻断输入校验问题，建议同轮收尾。没有依据要求重做正确的槽位算法、降低阈值、重置母版或扩展到生产级 Compiler。

**步骤门禁：** 无论 R1/R2 是否修复，当前真实 MZ 指定形态、普通画笔手绘、游戏动画/通行、人工美术确认及用户批准缺证据。步骤 01 不能通过，Profile 不能冻结，也不能进入步骤 02。

容量两对、完整不透明样板输入、没有半透明合成/任意帧数/生产分配器是批准的本步边界，不列为缺陷。以后扩展输入或岸线配方应按步骤 03/04 重新建立契约与测试；当前核心的独立 CLI/依赖边界可沿用。

## 10. 最终 Review 结论及整改建议

**代码及工程：REQUIRES_REVISION。真实 MZ：NOT_EXECUTED / BLOCKED。步骤 01 整体：REQUIRES_REVISION。** 修复后若仅代码复审通过，整体应转为 BLOCKED_PENDING_MZ_ACCEPTANCE，而不是 READY_FOR_USER_REVIEW 或通过。

整改应聚焦 R1 的真实快照及回归、R2 的必需清单校验。修复只提交新的本地 `codex/` 候选；保留本报告、本构建和失败反例，不覆盖原包/工程。对新 commit 按影响重跑类型/15 项原测试及新增回归、构建、原生 oracle、完整与缺文件 prepare 检查，并重新绑定受测身份；没有改变美术无需重置母版。

随后补齐上节实机证据及用户对最终候选的明确批准。本轮只写独立报告和独立证据，**未修实现、未改原 manifest/工程/报告、未提交或推送、未开始步骤 02**。

复现独立探针时，把证据目录中的 `native-review-probe.mjs`、`package-review-probe.py` 放回目标隔离目录 `.local/`，`pixels-review/` 放回 `.local/pixels-review/`；在该目录编译目标 SHA 后运行：

```sh
export PATH="/Users/dingshinn/.nvm/versions/node/v22.21.1/bin:$PATH"
node .local/native-review-probe.mjs
node .local/pixels-review/probe.mjs
node .local/pixels-review/buffer-overlap.mjs
python3 .local/package-review-probe.py . /Users/dingshinn/Desktop/rpg-maker-maker \
  "/Users/dingshinn/Library/Application Support/Steam/steamapps/common/RPG Maker MZ/RPGMZ.app/Contents/Resources/newdata"
```

Buffer 探针的进程正常结束，但 JSON `pass=false` 表示缺陷；package 探针的父进程 exit 0 表示审计/反例成功复现，其缺文件子进程不应成功却实际 exit 0。不能把这两个 wrapper 的退出码误读为实现 PASS。
