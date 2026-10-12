# 步骤 05 Coding 交接 — 稳定 Pack / Atlas / 标准导出

日期：2026-10-13，Asia/Shanghai。当前会话仅 Coding、自测、调试、构建、文档和 MZ 材料准备；没有 Reviewer/子Agent、Merge/Push/PR 或步骤06开发。

| 状态                | 结果                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Coding              | COMPLETE                                                                                     |
| 自动验证            | PASS（当前工程、Pack/PNG/历史/CPU范围）                                                      |
| 独立 Review         | NOT_EXECUTED_BY_DESIGN                                                                       |
| 步骤05 MZ 实机/视觉 | NOT_EXECUTED                                                                                 |
| 整体                | CODING_READY_FOR_REVIEW；统一步骤状态 READY_FOR_REVIEW，尚待独立复审、必要实机验收和用户批准 |

## 实际基线与配置

起始主目录 `codex/step-04-mz-compiler` / `af5b8e1c61175ca5627b15df37405e248bf26b37`，tracked干净；共40份独立报告/原文证据尚未提交。main、origin/main及实时只读远端均 `fc407198eefad9336ba97fb9482bdd832ca78f83`，没有上游step04分支。保留其他所有worktree/branch和本地资产，直接从该本地最新文档HEAD创建 `codex/step-05-pack-assembly`；没有从缺Compiler的旧main重做步骤04。

实际受审功能基线 `44a5239a979cd549e893df705df7704d043216be`，独立报告 SHA `903818ab1e8072eb6748818ea32634e01e79ea38ddba3a3be8ef0e5fdc72e748`，技术PASS、发现/阻断0。对应Build `step04-mz-44a5239a979c-ed3814944c9713b8` / Manifest `066986486f085491ba4fd9be31a3a29ae40eca8cfd7cfd47a611417d644ad131`。随后本地 completion receipt补齐了用户实际手绘Map002/003、固定岸线、动画和通行阶段证据，状态PASS_USER_REPORTED_IN_NATIVE_CORE_WITH_MODIFIED_NWJS_AND_SAVED_MAP_VERIFIED；原装Host没有升级为PASS。本次用户明确候选阶段批准及步骤05启动授权满足此前剩余行政门禁。

[基线引用](../evidence/step-05/coding/step04-stage-baseline.json)记录原completion receipt哈希、关闭的两个地图缺项和实际地图SHA。39a802a仅将既有Reviewer原字节及脱敏基线/config证据保存到步骤05本地分支；没有执行新的独立Review、修改原报告/旧Manifest或推送步骤04。原独立报告不符合当前Prettier排版，精确路径加入.ignore保留其证据SHA，不忽略生产代码或测试。

当前有效turn_context与collaboration settings明确 `gpt-6.1-sol / xhigh`；本地客户端 `service_tier=default`。逐请求和服务端最终tier均UNVERIFIED_NOT_EXPOSED；没有只依赖用户提示认定生效，没有改模型/全局配置、使用Priority子Agent或调度Reviewer。[配置记录](../evidence/step-05/coding/client-configuration.json)。完整阅读批准plans、AGENTS、运行环境、步骤03/04基线、Profile/Pixel Contract、最新Coding/独立报告及维护/发布/阶段验收入口。

## 最终候选与文档HEAD

**最终受测功能 Commit：`c09027f921e7d67469b301083db89acc44433d9e`。** 初始功能候选5062f1c及其构建保留。c09027f只增加无历史RETIRED拒绝与回归，正式Compiler/Profile/Pixel/领域包/母版不变；全部最终Pack除Manifest包装身份外的七文件与初始候选逐字节一致，见 [比较](../evidence/step-05/coding/candidate-payload-comparison.json)。

功能候选冻结后执行完整check、旧JS和工程/Pack出版及全部最终oracle。本文/需求索引/README/脱敏evidence为后续独立文档提交；实际文档/证据HEAD由Git和最终交付回复给出，不将该HEAD冒充受测功能SHA，也不为报告自引用反复提交。

## 模块职责与真实链路

新增 `pack-assembly → asset-core + mz-compiler`，十workspace的方向/构建/clean/真实JS与声明exports/工程产物收集已登记；lock只增加workspace importer/link，无registry版本升级。核心无文件I/O、Sharp、Web/ORM/Provider，API/Web/contracts/Gateway/CI源码未改。

[STEP_05_BASELINE](../engineering/STEP_05_BASELINE.md)定义 `mz-pack-v1 / mz-layout-v1 / stable-slots-v1`。Profile唯一机器源仍src/profile.ts，Pack仅固定其内容身份而不复制坐标表。Compiler沿用 `mz-compiled-fragment-v1 / mz-single-material-v1`，拥有相对语义布局和放置约束；Planner唯一选生产槽位；Renderer只复制Plan指定绝对区域，无第二套MZ quarter规则。导出工具不选槽。

真实链路：旧独立CC0母版与明确新配色revision → 有界PNG encode/decode → RawSource/ValidatedSource → 精确shoreline配方 → 处理IR/Built → compileFragment → planPack/validateLayout → renderAtlas → encodePng → 实际PNG重读/像素与Manifest校验 → 新stage验证 → 不可变目录。源PNG base64、provenance、style/parameters/recipe版本全部存sources.json，离线读回实际重放Compiler拥有对象；普通JSON Fragment不能伪造编译执行。

Pack区分稳定logicalId、逻辑revision、源revision、Fragment内容hash、slot/kind和Pack version；完整历史按previousHash/连续version验证。operations为显式变更集，遗漏保持；新增按ASCII logicalId排序仅分配Profile顺序的NEVER_USED；更新保留绑定且同revision不可改含义。RETIRED保留最后有效Fragment/像素，永不复用/清空/重激活；version1伪造RETIRED拒绝。当前历史注册表同kind+id+revision不能有冲突内容。容量每类2，满载或未知破坏性操作明确失败，无半成功布局。

水面groundId绑定同处理IR、精确recipe/parameters/dependencies/density及草地components。草地改版必须重建相关水面；退休水面仍保留原配套，因此与其旧草地不兼容的单独更新拒绝。旧Pack不因新版出现失效。有意更新可改变画面，本步保证槽位逻辑身份不被顶替，不承诺更新逐像素不变。

验证范围：Profile身份、所有公开JS标量/字段/稀疏数组、Fragment真实所有权/内容、完整history/绑定/retirement、配套、Plan尺寸/类别/kind/对齐/位置/边界/重叠、实际RGBA像素和完整透明保留区域、PNG资源/格式、八文件精确清单、说明/Manifest/files/hash/来源重放一致。修改并重新计算hash不能跳过布局和历史规则。snapshot/Plan深冻结，RgbaImage私有像素及copy getter；异步导出前拥有输入元数据。

标准八文件为A1/A2、pack/history/layout/sources JSON、INSTALL.md、manifest.json。Manifest有源码/lock/实际codec、Profile、关键模块/契约、绑定/状态/来源依赖、尺寸/文件SHA/像素SHA、推荐配置及实际结构验证。Build ID不自引用，manifest最终SHA在外部记录；Review/MZ/visual后续另存。失败stage清理、wx/已存在目标拒绝与旧成功保留只是本步单机CLI机制，没有提前实现DB事务/CAS/锁平台。image-adapter预算未增加。

## 自测、命令与回归

| 实际执行                                         | 结果                                                                                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| pnpm install --lockfile-only / --frozen-lockfile | PASS；Node22.21.1 / pnpm10.20.0；只登记新成员                                                                                                 |
| 最终冻结 pnpm check                              | PASS：19文件210/210、十成员方向、Strict/lint/format、干净build、8生产ESM exports                                                              |
| 新Pack/导出测试                                  | 22项，已包含在210中；真实步骤03→Compiler→Atlas/实际PNG、A→B→update→retire/JSON重读、容量/冲突/配套/非法布局/字段/所有权/异步输入修改/故障发布 |
| 原scalars.mjs在最终生产exports                   | 78/78；脚本SHA `506ec056e7eecde0410e7f05093531ed3d62a5f83b7a2d61482ef662c6c801b9`；未使用TS cast                                              |
| node scripts/build-engineering.mjs step05        | PASS；121实际JS/declaration/应用payload，冻结后重哈希全部一致                                                                                 |
| node dist/scripts/build-pack-sample.js           | PASS；8套正式Pack/16完整PNG，sources与历史可重放                                                                                              |
| 最终 verify-step05.js / 精确正版core             | 8套PASS，共3600 Tile/8,294,400像素，每套601 update；47连接＋代表47、3源/4播放状态、ACTIVE/RETIRED均覆盖                                       |
| Python PNG literal probe                         | 16最终PNG PASS；stdlib CRC/zlib/filter解码、原独立母版＋明确RGB旋转、手写四坐标及保留透明区，不import Planner/Compiler/Sharp；属于作者自测    |
| export-pack.js 重复请求、新目录                  | 八文件字节完全一致；同像素与新commit包装身份分别验证                                                                                          |
| 重复export/suite/engineering/旧地图副本          | 均以非零退出明确拒绝；成功目录不受影响                                                                                                        |
| prepare-step05.js                                | 新真实手绘地图副本PASS；五份地图/数据库JSON原SHA不变                                                                                          |
| 旧material sample / prototype出版                | PASS；13素材payload与原四PNG回归保持；末次快照guard未改相关模块/像素                                                                          |
| ZIP逐成员重开/hash校验                           | PASS；95成员，无Runtime/RTP/Host/.env/DB                                                                                                      |

精确命令、退出码、时间和日志见 [commands](../evidence/step-05/coding/commands.json)；原日志在.local保存，Git镜像仅替换仓库绝对路径为&lt;repo&gt;，raw/sanitized SHA分别记录。CPU计数是执行次数，不相加为独立覆盖率或实机PASS。源1在四播放状态中重复；601为0..600 update观测。独立PNG预期是参考依据，不是本会话独立Agent Review。

调试失败保留：literal类型widening/Strict数组索引、未用import、原Reviewer报告排版、测试把原288宽度误作篡改、样例recipe复用旧revision。最终修正新样例revision并硬拒绝跨history冲突；未删失败用例/降阈值/重置母版。最终收尾发现版本1可伪造退役，公开JS red在5062接受、green在c090报PACK_TRANSITION；修订后完整check/78/所有构建与CPU重验。详见red/green/probe文本。

DB集成/迁移、Playwright开发/生产、远端CI、MZ GUI/Host/游戏/肉眼美术均NOT_EXECUTED_THIS_ROUND。没有API/Web/Prisma/HTTP/启动改动，也无新页面/DB依赖，故完整现有unit/Vite隐私检查足够覆盖本步工程影响；不为形式完整复用私有DB或.env。没有本轮长期服务，未修改既有数据库/全局MZ/NW.js/RPGReactor/模型或Prompt。既有Vite>500k提示、native codec无OS硬RSS上限及未来HTTP/remote图片入口资源门禁继续按旧规则保留。

## 构建、关键SHA与交付

工程Build `step05-c09027f921e7-140ec0b68f156030`，Manifest SHA `a1eb731038f19c8c4b522bbe986c85ed8a1a9f6f31c1f9da10dad8ba700cbfbb`。Pack Suite：`artifacts/step05-suite-c09027f921e7/`。每份标准目录含八文件、请求存suite根；全部Manifest及Pack/Plan/history镜像和SHA索引见 [builds](../evidence/step-05/coding/builds.json)。

| 样例                  | Build ID                                    | Manifest SHA-256                                                   |
| --------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| incremental-v1        | `step05-pack-c09027f921e7-317866ef2a68c693` | `4c785cf73182883a2e2c09679a5e4a1b1b3318163ae8231c12b1d767672fc2ba` |
| incremental-v2        | `step05-pack-c09027f921e7-ceb0a9a5c7007831` | `81af56180772595448d8eeb632c9a6e3a0bb1b0f5e8c103d3510aa4369ded8d1` |
| incremental-v3        | `step05-pack-c09027f921e7-e741008a23ac72cb` | `b302db1f7a3ba6064fdc274c3b4a15868c4c05f4fae8ee08bf9fe9b40e33f323` |
| incremental-v4        | `step05-pack-c09027f921e7-479d11efd325b921` | `6d1a95a6a0997cb913986aee078befc6376a6c73f2de4000c7ec1cfcaacb0f9f` |
| art-old-map-v1        | `step05-pack-c09027f921e7-de6ed955473da1b7` | `e6299bacce5adfb1788853cdc8edd5a534e9c7193460e15a0cbcabba1ab5edea` |
| art-old-map-v2        | `step05-pack-c09027f921e7-3729d0975bc79482` | `2ff6daeab7b62f17af87cf459f4cb717e2696f3d68dabe9aa0cf4abaac436872` |
| diagnostic-old-map-v1 | `step05-pack-c09027f921e7-a477b504400b01a8` | `64ceed8fb00c88a57e3f0717fecd0047d30949463a6b04f9f110edd07b28a0ae` |
| diagnostic-old-map-v2 | `step05-pack-c09027f921e7-11ec0663a75746d6` | `7bcb3afe62f8408924e25abbcb9bff58b7aad93b863b361f65dbcbec83f69251` |

| 主要交付Pack          | A1 PNG SHA-256                                                     | A2 PNG SHA-256                                                     |
| --------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| incremental-v2        | `c6643ddac287d996f7667ee132e5f6748c201f81858386d413589a5786ad24ba` | `39000c74834fe5ea69e919297c7cd66378fda87a33acc528bb0ae2875fa766ec` |
| art-old-map-v2        | `2dad4d6822dc481e07ea2e4947e800128edf06e7ff11dfc69a2cccab1f81ad2b` | `ab0bdfab9f27f8238ee23b1bea60f58c616bb12cace933f4aab055c3fa646b5a` |
| diagnostic-old-map-v2 | `cca72e32977567291f2a278f804a77bf1c38d03c9e1ff3c0c342c6b30a3c668b` | `44eacc0a7b4ada40870fac5f42fe1028ce16f7047c3285c090307bd29574f61f` |

验收ZIP：`.local/step05-acceptance/step05-c09027f921e7-acceptance-v2.zip`，SHA `61f386e03ab0fec51bd2b51b00201643f9e25aa5c1301980dd9c9f38965ef07c`，95成员；含全部Pack/请求、12张实际PNG来源CPU矩阵及reference、指南/契约/模板与原手绘地图参考副本。只在本地，正版核心/RTP不包装。[delivery](../evidence/step-05/coding/delivery.json)记录逐成员SHA和操作路径。

## 两类MZ材料与停止边界

A首次安装用incremental-v2（两种可辨配色），按INSTALL/指南在新工程数据库注册A1/A2、Area/48px和推荐flags，正常手绘/游戏检查；v1→v2展示新增B，A位置/未更新像素不变，v3更新A配套、v4退役B保留。

B使用实际步骤04手绘Map002/003。art/diagnostic-old-map-v1逐字节复现原四PNG及原kind绑定；v2更新a组revision2并退役b组，保持b旧像素。原图已用完四槽，新增C必须拒绝；不复用退休槽或改Tile ID腾空间。新本地工程：`.local/mz/step05-update-c09027f921e7/game.rmmzproject`，只替换四PNG，Map001/002/003、System/Tilesets全部原字节，新的step05-build-reference绑定两个前后Build。原工程未动，也未重造地图充当旧图回归。

原Map002 SHA `250a17a5fb092898a94a2a44c5572fafebc30441a01be979ed4b7c54be0ac52e`；Map003 SHA `d4c15be39f93f629bb90b56f7b21e6e67086dece0eb4745c7a90814ac1b9b8ee`。本步两场景实际编辑器/游戏/视觉仍NOT_EXECUTED，不把准备或CPU验证写为用户验收。指南：[mz-acceptance](../step-05/mz-acceptance.md)。Original Native Host延期（最迟步骤10）、旧Map003(4,10)待补保留，不自动免除本步实测。

Reviewer应重点检查：完整基线diff/有效配置、Profile唯一来源/固定hash、序列化history与执行Fragment的边界、root退役反证、逻辑ID与精确revision冲突、同IR配套及retired依赖阻止单独草地更新、Plan重哈希篡改拒绝、最终PNG独立预期/CPU范围、标准导出源归档/Manifest一致性、失败目录保护，以及旧手绘地图容量满载时不迁移的实际语义。

保护复核：2208个开工前文件中，1032旧artifact、41份MZ地图/receipt、40份Reviewer原字节均未变；1095旧tracked仅7项预期工程登记/格式保留策略改变，Profile/两份plans/原型/母版/领域与Compiler/API/Web/CI无差异。README/需求索引为本报告后的文档更新。所有既有worktree/ref/历史产物保留，main/远端仍fc407198。主目录最终只在本步分支提交，ignored新产物/副本保留；未复用/迁移DB，未启动MZ或付费模型，无推送/合并/PR。

**本轮到Coding ready for Review停止；步骤06未启动，独立Review与必要MZ验收由后续会话/用户另行执行。**
