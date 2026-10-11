# 步骤 01 — 最新验收候选与插件文件格式修复

## 当前候选（2026-10-11，Asia/Shanghai）

2026-10-12用户提供本轮新工程的数据库截图：可见Step01 art、区域类型、art_A1/art_A2、
两个草地○、两个水面×，配置可见项已确认；背景显示Map001程序诊断图。
这不是正常手绘或游戏证据，Host、地图拼接与动画通行仍待验证。
截图及逐项记录见本候选证据目录`manual-2026-10-12/database-art.json`。
依据实际截图更正了文档中的水面调色板位置（第1行第5/7格），不改变机器Profile。

用户打开此前已准备工程时报告“无法读取文件plugins.js”。文件存在且可读，旧生成器写入
自定义文件头和同一行的`var $plugins = [];`，与MZ生成格式不同。
在外部备份后，只把旧工程的`js/plugins.js`换为正版空模板原字节，其他638文件哈希不变；
用户明确反馈“已成功打开工程”。该结果记为**旧工程修补后打开PASS_USER_REPORTED**，
没有推导新候选、手绘、游戏或Native Host通过。修补记录的过时“确认待定”备注已纠正。

准备工具现先校验模板标准头、分行和空JSON插件数组，随后写缓存原字节，reference保存
pluginsSHA；无效或非空模板在mkdir前拒绝，不执行模板代码。
新增4项测试，**52/52、typecheck、build通过**；本轮原生oracle重新通过960次选图、
2,211,840像素、241update。原48测试、Profile、Compiler、契约、母版及四PNG均不变。
[本次独立复审](step-01-plugins-independent-review.md) **PASS**：另有25边界用例、12次无效
模板CLI、完整新工程插件字节与原件一致、重复prepare保护639文件的真实验证。
此前P2整改报告已归档为 [历史报告](step-01-before-plugins-fix.md)，所有独立结论保留。

| 最新受测对象 | 身份 |
|---|---|
| Code Commit | `432ffdef8d18e13950b14f290de3ae4f2f83aacd` |
| Build ID | `step01-56368269c8328e0f84b9` |
| Manifest SHA-256 | `1be77467ae7d5fab2c574dce1918d3c4a9a4b54b64a7beda0a42e89c8461351b` |
| plugins.js SHA-256 | `2116dfda46bec80e7fab4b7e97b94931c47c9fb3642e6fa4c1625d0016b448a0` |
| ZIP SHA-256 | `050763997e005192e5382742d751f608c8faa9643cfb9434c17f483f46e03f39` |

正式后续验收使用新工程：
`/Users/dingshinn/Desktop/rpg-maker-maker/.local/mz/step01-56368269c8328e0f84b9/game.rmmzproject`。

新素材包（21项，35,982字节；没有正版Runtime/RTP）：
`/Users/dingshinn/Desktop/rpg-maker-maker/.local/delivery/step01-56368269c8328e0f84b9-acceptance.zip`。
流程仍按 [验收指南](../step-01/mz-acceptance.md)。在新工程开始手绘前应实际重新打开确认，
原工程与地图保留；不能把旧工程打开确认自动记为新工程通过。

**步骤01仍BLOCKED**。新候选加载、Map002/003正常手绘、实际游戏动画/通行/图层、人工美术、
Host核实及用户批准仍待完成。未更改全局MZ/NW/RPGReactor，未开始步骤02。
正式证据见 [索引](../evidence/step-01/step01-56368269c8328e0f84b9/evidence-hashes.json)。

## 此前P2整改记录（以下身份属于前一候选）

日期：2026-10-11，Asia/Shanghai。**步骤状态：BLOCKED，等待正式 Native MZ 实机验收与用户批准。**
本轮独立代码/工程复审 **PASS**，P2-01/R1、P2-02/R2 均 **CLOSED**。
未标记APPROVED，未开始步骤02，未调用付费模型、推送远端或修改全局环境。

## 基线与候选身份

开始HEAD为 `cf00baa464d9355900e4e7abc386b7a57cdfaa73`。工作区已有AGENTS.md修改、环境说明、
正式独立Review及证据，先保存逐文件哈希，再以 `a1e94af` 原样提交这些输入；未重置或覆盖其他工作。
实现缺陷基线仍为301d3cd。本轮修复提交在本地 `codex/step-01-mz-prototype` 分支。

| 项目 | 受测值 |
|---|---|
| **代码Commit** | **`e795bb6495de8a4e147c68dac89bee58caab17da`** |
| **Build ID** | **`step01-fdf7768b475e24c66cfd`** |
| Manifest SHA-256 | `94562db3c57c2496013b3655dd01ad7aa2929acf44115805f94455153e8c2eb2` |
| Profile | `mz-native-ground-water / 1.0.0-candidate.1`，未改变、未实机冻结 |
| Pixel Contract / Compiler | `rgba8-srgb-integer-v1` / `fixed-prototype-v1`，未改变 |
| 母版 | `original-fixtures-v1.1`，图像与来源哈希未改变 |
| 工具链 | Node22.21.1、pnpm10.20.0、TS5.9.3、Sharp0.34.5、Vitest4.0.18 |

本报告与证据随后以文档提交入库，受测代码始终绑定上述Commit。
新ID来自源码Commit变化；四PNG与旧版字节相同。新候选已重新构建、验证及复审，
没有自动移用旧验收状态。不可变manifest保留发布时NOT_EXECUTED，后续证据外置。

## 两项修复及回归

**P2-01/R1：Buffer多行重叠污染。** 旧实现的Buffer.slice返回共享视图；向下写第一行会
改变尚未读取的下一行，1×3最小反例得到`[1,1,1]`，应为`[1,1,2]`。
`src/pixels.ts` 现在在任何写入前，每行显式构造拥有独立存储的`new Uint8Array(...)`。
同Buffer及不同Buffer/Uint8Array共享视图、非零offset均真正快照；坐标、Alpha、精度与
非重叠行为不变，没有改像素契约。

`tests/copy-rect.test.ts` 新增9项独立字节期望：向下/上、斜向、横向左右、同矩形、
共享底层视图与非重叠保护。独立Reviewer将相同9测试原样移入旧提交，**4 fail/5 pass**；
另写8,704次不同stride、错位/非像素对齐视图及无关backing字节对照：旧226差异，
新 **8,704/8,704**。作者最小反例修改前/后也已真实保存。

**P2-02/R2：缺图清单仍成功准备工程。** 旧CLI删除diagnostic_A2清单条目及文件后仍exit0。
新增最小 `scripts/prototype-input.ts` 预检工具，要求prepare固定引用的精确四图集合
diagnostic_A1/A2、art_A1/A2；检查字段类型、Profile、SHA格式、既有身份算法，再确认每图
可读、哈希匹配、合格RGBA8 PNG且768×576。预检全部在目标mkdir/copy之前完成，错误指出图集名。

`scripts/prepare-mz.ts` 写入缓存的受检PNG字节，并使用同份缓存Manifest哈希，避免预检后
重新读路径造成不一致；旧工程仍以EEXIST保护。reference明确Host未核实、Native未执行。
`tests/prepare-mz.test.ts` 新增24项覆盖完整、四图分别缺项/缺文件、空/无效清单、坏hash、
目录、损坏PNG、匹配hash但非PNG/错误尺寸、身份变异、额外路径和缓存字节。

实际CLI验证也通过：作者完整工程成功、8种无效输入不创建目标，已有639文件不变；
独立Reviewer **36种输入×两种目标状态=72次**全部拒绝且保护目标。另在CLI预检后立刻改写
四PNG与Manifest，新工程仍写原受检字节和原reference哈希。此工具不是生产Pack schema。

## 全部适用检查

原 `tests/prototype.test.ts` 的15项原样保留，未删用例、降阈值或重生成母版。

| 实际命令/检查 | 真实结果 |
|---|---|
| `pnpm install --frozen-lockfile`（隔离新候选） | exit0 |
| `pnpm typecheck` | exit0 |
| `pnpm test` | exit0，3源文件 **48/48 = 原15 + 新9 + 新24** |
| `pnpm build` | exit0 |
| `pnpm prototype`（主目录/隔离新候选） | exit0，ID、Manifest、四PNG字节一致 |
| `pnpm verify:mz '<正版newdata>/js/rmmz_core.js' artifacts/step01-fdf7768b475e24c66cfd` | exit0，960次选图、2,211,840像素、241更新计数 |
| `pnpm prepare:mz '<正版newdata>' artifacts/step01-fdf7768b475e24c66cfd` | exit0，新工程；重复预期EEXIST，639文件不变 |
| 独立Buffer及旧新版回归 | 新8704次全过；旧226差异，原样新测试旧4fail |
| 独立无效输入CLI/目标保护 | 72次拒绝且目标未污染；旧缺图反例exit0再次复现 |
| 独立预检后输入变更 | PASS，写入原经校验字节/哈希 |
| 新候选重复构建 | 预期拒绝覆盖，5文件hash不变，无stage/lock遗留 |
| 新ZIP | CRC、Manifest原文、全部源/图集SHA-256通过 |

960是检查次数，包括水state1/3读取同一源1；不是960种不同邻接或实机行为。
oracle只在Node执行外部固定哈希Tilemap和像素对照，不包含GPU、编辑器或玩家操作。
作者及Reviewer各自隔离重建。隔离shell曾选到Node22.14.0，记录为非基线实验；随后
显式选择22.21.1重装/检查/构建，正式ID及全部字节一致。未将非基线结果当正式PASS。

完整stdout、前后反例、CLI日志、隔离重建及独立探针见
[新证据索引](../evidence/step-01/step01-fdf7768b475e24c66cfd/evidence-hashes.json)。
只归档日志/报告/JSON/探针和原创图片，未递归复制含正版Runtime/RTP的隔离工程。

## 独立复审与历史

本轮 `/root/p2_independent_review` 未参与Coding，重新安装、构建并设计独立反例。
[整改复审](step-01-p2-independent-review.md)：**代码PASS，R1/R2 CLOSED，步骤仍BLOCKED**。
复审报告SHA-256：`5b7a608527cb13dbdd7dd5cb75a51681b0233937feed4e50e75fa28835c2200d`。

此前 [正式独立Review](step-01-independent-review.md) 对301d3cd的REQUIRES_REVISION原样保留；
[此前Coding报告](step-01-before-p2-remediation.md)、更早Review/证据及旧包也保留。
Profile、Compiler、母版、原15测试、锁文件与两份批准方案均未改变。

## 最新产物与验收材料

本轮使用 **step01-fdf7768b475e24c66cfd**，旧step01-ffc5300c7fb2cb94a48a仅供历史审计。
目录：`/Users/dingshinn/Desktop/rpg-maker-maker/artifacts/step01-fdf7768b475e24c66cfd/`。

| PNG | SHA-256（与旧图一致） |
|---|---|
| diagnostic_A1.png | `de08f8bc36b87017afbb62aba946d612e8f4536939c0db707bbbbcbfd93b337f` |
| diagnostic_A2.png | `b493ecc86e938dc9aa4f389ba6b1b052222baeade6bb1d58dea7b003126330cd` |
| art_A1.png | `d896c5c8b62816e844865b2abe12a0d5c1694aceb6cd3c75f93eccbd6c55d9d2` |
| art_A2.png | `7d60ac8c6072d38736e4027cc25fa23979de6e400b9c66d4f586a108506b2b2b` |

新ZIP（31项、78,012字节；原创素材、契约、环境说明、指导和本轮新生成CPU预览）：
`/Users/dingshinn/Desktop/rpg-maker-maker/.local/delivery/step01-fdf7768b475e24c66cfd-acceptance.zip`

ZIP SHA-256：`9b7bb11f32693b99667befb4b082e861102f8c8579ca4cc83eac5122875ec40a`。

新本地测试工程：
`/Users/dingshinn/Desktop/rpg-maker-maker/.local/mz/step01-fdf7768b475e24c66cfd/game.rmmzproject`

直接打开，**不必重跑prepare**。Map001是程序指定形态，Map002/003仍为空白，没有手绘证据。
六core与模板字节相同、插件空、Area/48px/通行配置正确只属静态检查，不代表游戏启动。
最新 [指南](../step-01/mz-acceptance.md) 和 [模板](../step-01/acceptance-record.template.json)
已补Host分类与禁止全局替换规则。

## 环境与待完成门禁

按 [新环境约束](../engineering/MZ_RUNTIME_ENVIRONMENT.md) 只读检查：编辑器/模板core1.10.0、
模板PixiJS5.3.12；NW应用bundle报告154.0.8037.58、二进制arm64。bundle字段不能当作NW产品
版本或实际运行测量。**实际NW/Host Node/Chromium版本和Host来源仍NOT_VERIFIED**。
未启动Host/编辑器，未执行初始化、更换全局MZ/NW/RPGReactor或修改现有游戏工程。
原生核心工程与增强工程分开，没有用Modified NW/RPGReactor结果证明Native通过。

| 验收层次 | 当前状态 |
|---|---|
| 实现、48测试、独立代码Review | COMPLETE / PASS |
| 指定形态真实MZ显示 | NOT_EXECUTED |
| 普通画笔Map002/003手绘、邻接/图层行为 | NOT_EXECUTED |
| 游戏水面动画、静态岸线、四方向通行 | NOT_EXECUTED |
| 人工草地/水面/岸线美术确认 | NOT_EXECUTED |
| Modified NW兼容 / RPGReactor兼容 | 各自NOT_EXECUTED |
| Profile实机冻结 / 用户批准 | 各自NOT_EXECUTED |
| **步骤01** | **BLOCKED，未APPROVED** |

用户需先确认独立、合法且符合正式Native基线的Host；无法核实时保持正式运行验收
NOT_EXECUTED，升级NW另记补充测试，不替代基线，也不要求修改现有安装。
在指定新工程按指南核对版本/数据库，留Map001显示证据，正常手绘并保存Map002/003，
实际游戏验证两草/两水槽、0→1→2→1至少两周期、静态岸线、草可走/水不可走；
反馈原始地图、截图/录像、实际Host资料、逐项结果及人工美术意见。
后续保存新的外部验收记录，引用新Commit/Build/哈希，不改已发布manifest。

本轮无未关闭的已知代码问题。必要实机、人工证据及用户批准仍为步骤门禁；
只有用户明确批准满足门禁的候选，才允许进入步骤02。
