# 步骤 01 两项 P2 整改独立复审

记录日期：2026-10-11，Asia/Shanghai。Reviewer：`/root/p2_independent_review`，未参与本轮 Coding。复审范围仅为上轮 R1/R2 整改与其影响的步骤 01 回归。

| 结论层次 | 本次结论 |
|---|---|
| 两项 P2 | **R1 CLOSED / R2 CLOSED**：原缺陷可复现，新候选通过针对性独立验证 |
| 代码及工程复审 | **PASS**；未发现需要继续整改的新代码问题 |
| 真实 MZ 验收 | **NOT_EXECUTED / BLOCKED**；未启动编辑器或 Playtest Host |
| 步骤 01 整体 | **BLOCKED_PENDING_MZ_ACCEPTANCE**；Profile 不冻结，不能进入步骤 02 |

本报告是绑定新候选的独立复审；保留 `docs/reviews/step-01-independent-review.md` 原样，其对旧提交的 **REQUIRES_REVISION** 结论不被改写。旧 Coding/Review 报告中的旧候选 PASS 不能自动移用于本提交。

## 受测身份与依据

| 项目 | 本轮独立核实 |
|---|---|
| 仓库 / 原分支 | `/Users/dingshinn/Desktop/rpg-maker-maker` / `codex/step-01-mz-prototype` |
| **受测 Commit** | **`e795bb6495de8a4e147c68dac89bee58caab17da`** |
| 原缺陷对照 Commit | `301d3cdb37743a53eff6046ccf2b23aea0ab8122` |
| 新不可变 Build | `step01-fdf7768b475e24c66cfd` |
| Manifest SHA-256 | `94562db3c57c2496013b3655dd01ad7aa2929acf44115805f94455153e8c2eb2` |
| Profile | `mz-native-ground-water / 1.0.0-candidate.1`；`CANDIDATE_REQUIRES_EDITOR_AND_GAME_EVIDENCE` |
| Pixel Contract / Compiler | `rgba8-srgb-integer-v1` / `fixed-prototype-v1` |
| 母版 | `original-fixtures-v1.1`；本轮未修改 |
| 检查环境 | Node 22.21.1、pnpm 10.20.0、TypeScript 5.9.3、Sharp 0.34.5、Vitest 4.0.18 |
| 精确隔离新提交 | `.local/remediation/reviewer/candidate`，本地 clone，detached HEAD 为受测 SHA |
| 精确隔离旧提交 | `.local/remediation/reviewer/old-301d3cd`，detached HEAD 为原缺陷 SHA |

先完整阅读仓库 AGENTS.md、`docs/engineering/MZ_RUNTIME_ENVIRONMENT.md`、两份批准方案（822 行 / 137 行）、上轮正式独立 Review、`docs/reviews/step-01.md` 及 `docs/step-01/mz-acceptance.md`；再审阅修复代码和新增测试。作者提供的测试数字没有被当作本轮独立依据。

新提交在隔离目录亲自重新安装、编译、构建。开始及完成新构建时源工作区与隔离 candidate 的 Git 状态均干净；没有使用旧 dist。`301d3cd..e795bb6` 的 Profile、Compiler、母版创作脚本、全部 fixtures、原 15 测试、锁文件、两份批准方案、Profile 文档和像素契约逐项无差异。没有改变原生槽位、动画时基或步骤边界。

## 独立自动验证

`<candidate>` 为上表隔离新目录，`<template>` 为本机正版安装的 `RPGMZ.app/Contents/Resources/newdata`，`<build>` 为候选下 `artifacts/step01-fdf7768b475e24c66cfd`。首次检查从 `2026-10-11T15:12:47Z` 开始；逐项时间、命令与退出码保存于 `automatic-checks.json`，原始 stdout/stderr 保存为同名日志。

| 亲自执行的命令 / 检查 | 真实结果与证明范围 |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0，锁文件可安装；既有 esbuild lifecycle allowlist 警告未影响测试/构建 |
| `pnpm typecheck` | exit 0，Strict 检查 |
| `pnpm test` | exit 0，3 文件 **48/48**：原 15 + 新 9 overlap + 新 24 preflight；原测试未删、未降阈值 |
| `pnpm build` | exit 0，独立 TypeScript CLI |
| `pnpm prototype` | exit 0，重建出指定新 Build ID、manifest 原字节哈希及四 PNG 字节哈希 |
| `pnpm verify:mz '<template>/js/rmmz_core.js' '<build>'` | exit 0：48 索引、960 次图块状态、2,211,840 像素、241 更新计数；仅外部原生 Tilemap / CPU oracle |
| 新候选重复 `pnpm prototype` | 预期 exit 1，`Immutable build already exists`；5 文件哈希不变，无遗留 stage/lock |
| 直接运行新 `dist/scripts/prepare-mz.js`，完整输入 / 独立工作目录 | exit 0，639 文件的新工程；没有创建父 Agent 负责的主工程目录 |
| 完整工程同目录重复 prepare | 预期 exit 1 / EEXIST，**639 文件全部哈希不变** |
| 独立多方向、不同 stride/offset/视图复制探针 | 新候选 **8,704/8,704** 与整块 backing 快照的逐字节期望一致 |
| 同一独立复制探针对旧 301d3cd | **226 个差异**，探针预期 exit 1；保留原失败结果 |
| 新 9 overlap 测试原样复制至旧隔离提交后运行 | 旧实现 **4 fail / 5 pass**，exit 1；新候选相同测试 **9/9** |
| 独立无效输入 CLI 检查 | **36 种 × 两种目标状态 = 72 次**，新 CLI 全部拒绝且不新建/不破坏目标 |
| 同一缺清单/缺 PNG 反例运行旧 CLI | 旧 CLI **exit 0**，目标存在但 `diagnostic_A2.png` 不存在；原 R2 确实复现 |
| 预检后输入路径被改写的真实 CLI 探针 | 创建目标目录后立即改写输入四 PNG 和 manifest；新 CLI exit 0，仍写四份原经校验字节并记录原 manifest 哈希 |

旧隔离目录第一次直接 shell 检查意外取得 Node 22.14.0，产生了另一个非正式旧构建。发现后明确设置 Node 22.21.1，重新执行 frozen install/build/prototype，得到原正式 `step01-ffc5300c7fb2cb94a48a` 和原 manifest SHA `211790adf8aa421df3c0d525653141dbb4f545ddf1e9e83001199124e22c110a`。以上旧/新 CLI 与回归对照使用明确指定的 Node 22.21.1；没有把前一环境结果冒充正式身份。

### R1 — 合法 Buffer / 共享视图快照：CLOSED

`src/pixels.ts:114` 在任何目标写入之前，将每一行构造为拥有独立存储的 `new Uint8Array(...)`；不再依赖 Buffer.slice 的别名语义。这符合现有像素契约，未扩大到新的素材处理服务。

新增测试保留原测试并补充多行向下/向上、斜向右下、横向左右、同矩形、独立 Buffer / Uint8Array 共享底层视图（非零 offset）和非重叠保护。Reviewer 另写的探针不使用 copyRect 的实现生成期望，而先复制**整个底层 backing**，再用不同源/目标 stride 的逐像素地址计算期望。枚举如下：

| 自主类别 | 次数 |
|---|---:|
| 同存储全部矩形、所有方向；四种 Buffer/Uint8Array 组合 | 3,600 |
| 不同源/目标 stride、错位共享视图 | 1,600 |
| 反向错位共享视图 | 1,600 |
| 非像素对齐 byteOffset 的合法视图 | 784 |
| 非重叠视图 / 无关 backing 字节保持 | 1,120 |

共 8,704 次；新实现零差异，旧实现 226 个差异。同样的新增 9 测试对旧实现实际失败于向下、斜向、多行共享 Buffer→Buffer 和 Buffer→Uint8Array 四项；其余五项通过。这说明测试有能力发现原缺陷，既没有仅验证新实现形式，也没有把旧代码失败当作新候选 FAIL。

证据：`overlap-probe.mjs`、`overlap-candidate.json`、`overlap-old-301d3cd.json`、`old-new-regression.log`、`regression-and-complete.json`。

### R2 — 四图与身份输入预检：CLOSED

`scripts/prototype-input.ts:18` 在 prepare 的任何目标 mkdir/copy 之前读取并缓存 manifest 原字节，校验根/字段类型、精确 Profile、完整 commit、固定 buildId 格式、**四项精确 files 集合**和各 SHA-256、pixel contract / compiler / 环境身份类型、原 identity 字段顺序对应的 buildId。随后每张必需图按声明 SHA 检查、用现有严格 PNG 输入契约解码，确认 **768×576**，缓存 bytes。`prepare-mz.ts` 按必需文件名单写入缓存 bytes，reference 使用同一份缓存 manifest 哈希。

自主 CLI 检查覆盖四项分别缺清单条目/缺文件、空/无效 files、null/array/string/空根清单、损坏 JSON/缺 manifest、损坏 commit/buildId/identity 字段、改变 Profile/契约/compiler、附加路径条目、错误哈希、目录冒充 PNG，以及**匹配声明哈希且重新计算 buildId 的非 PNG、错误尺寸合法 PNG、坏 CRC PNG**。

每种变异分别在目标不存在和已有两个用户内容哨兵文件的目标上执行。72 次均 exit 非零；不存在的目标未创建，已有目标所有字节哈希不变。不是只调用 helper 的单元自测。旧 CLI 对上轮缺 `diagnostic_A2` 的同一反例仍 exit 0 并创建缺图工程，证据包含四图存在性 `[true,false,true,true]`。

另外在真实 CLI 完成预检、开始创建项目后改写输入路径；最终四图与 reference manifest 哈希仍等于发布构建。这从实际命令层验证了缓存写入策略，而非仅根据作者的缓存测试推断。

证据：`cli-probe.mjs`、`cli-probe.json`（73 个子进程，72 个新候选检查 + 1 个旧反例）、各隔离 case 的 `cli.log`、`cache-race-probe.mjs`、`cached-input-race.json`。

构建身份是内容一致性校验，不是签名或外部来源认证；本实验未声称提供生产级 Pack schema/持久化/不可信供应商验证。没有要求在本轮建立这些步骤 02–10 能力。

## 产物与原生规则回归

| PNG | 本轮独立重建 SHA-256 |
|---|---|
| diagnostic_A1.png | `de08f8bc36b87017afbb62aba946d612e8f4536939c0db707bbbbcbfd93b337f` |
| diagnostic_A2.png | `b493ecc86e938dc9aa4f389ba6b1b052222baeade6bb1d58dea7b003126330cd` |
| art_A1.png | `d896c5c8b62816e844865b2abe12a0d5c1694aceb6cd3c75f93eccbd6c55d9d2` |
| art_A2.png | `7d60ac8c6072d38736e4027cc25fa23979de6e400b9c66d4f586a108506b2b2b` |

新旧四图字节完全一致，新构建 ID 来自新源码 commit。Profile 保持草 kind16/17（2816/2864）、水 Block D kind4/6（2240/2336）、24px quarter、三源 `0→1→2→1`、每 30 update 推进一状态、草 flag0 / 水 flag15 / 空上层 flag16；没有新槽位或生产分配器。

本轮亲自执行外部正版原始 Tilemap，core SHA `4ad828ae6cdd8b526e25591eaffd1ccf5ac4eb753f865f7ff48a0b3c821ff67f` 与 Profile 一致。960 为真实检查次数（含重复播放状态 source1），不能解释成 960 种不同形态或实机行为。core VM 结果限于选图矩形、像素与 update 计数，不含编辑器、GPU 或玩家操作。

完整新工程静态审计：六份 core 与正版模板字节相同；PIXI 库文件头为 5.3.12；空插件；两组 Area Type 的 A1/A2 名称、48px、两个草/水 flag、空 B flag、起点 Map002(1,1) 正确。Map001 为程序形态图；Map002/003 仍各 1,326 个全零 layer 数据，尚非手绘地图。reference 保持 editor/game/native 验收 `NOT_EXECUTED`、Host `NOT_VERIFIED`。静态组装成功不记为运行 PASS。

## Runtime 环境与保留门禁

只读查看安装信息：编辑器及模板 core 为 1.10.0。应用内 `nwjs.app` 的 Info.plist `CFBundleShortVersionString` 报告 **154.0.8037.58**，`file` 报告 Mach-O arm64。**该字段不能作为 NW.js 产品版本，也不能独立证明实际 Chromium/Host Node 版本或原生 Host 来源。** 实际 NW 产品版本、实际加载 Host 的 Chromium/Node 版本、Host provenance 均 **NOT_VERIFIED**。模板 PIXI 文件版本只证明本轮静态工程的库来源，不冒充实际运行测量。

未启动 MZ / NW / 游戏，未执行初始化、doctor/setup、RPGReactor 安装或全局 NW 替换脚本。没有把 Native Core + Modified NW.js 或 RPGReactor 的结果写成 Native MZ PASS；本轮三类运行环境的真实兼容结果均未执行。

| 仍需补齐的必要门禁 | 状态 |
|---|---|
| 指定形态真实 MZ 渲染 | NOT_EXECUTED |
| 原生普通画笔手绘 Map002/003，邻居重算、孔洞等 | NOT_EXECUTED |
| 实际游戏动画/静态岸线/四方向通行 | NOT_EXECUTED |
| 人工草地—水面—岸线美术确认 | NOT_EXECUTED |
| Profile 实机冻结 | NOT_EXECUTED |
| 用户批准确定的新 commit/build | NOT_EXECUTED |

完整实机执行前必须核实正式 Native Host 基线；如为 Modified NW.js，另记录补充测试，不能替代 Native 基线。后续证据保存为新的外部记录，引用本轮 commit/build/manifest/PNG 哈希；不向已发布 manifest 添加 PASS，不重造手绘地图掩盖问题。

## 证据保存与最终建议

本轮所有 Reviewer 探针、日志、JSON 与报告均在 `.local/remediation/reviewer`；`evidence-hashes.json` 为顶层可归档证据逐文件 SHA-256。`candidate` / `old-301d3cd` / `cli-cases` / `complete-prepare` / `cached-input-race` 下的正版工程及 runtime 只在 `.local`，不能作为源文件入库或对外发布。可归档本报告、JSON、探针脚本、命令日志和原创 manifest 快照；不要递归复制整个 Reviewer 目录。

**本轮建议：代码复审 PASS，关闭 R1/R2；步骤 01 保持 BLOCKED_PENDING_MZ_ACCEPTANCE。** 没有新阻断代码缺陷；实际 Native MZ、人工美术与最终用户批准缺证据仍是步骤门禁。未修实现、未改旧报告/manifest/既有用户工程、未提交/推送/合并、未调用模型、未开始步骤 02。
