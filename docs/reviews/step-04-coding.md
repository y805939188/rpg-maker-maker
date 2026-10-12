# 步骤 04 Coding 交接 — 正式 MZ 单素材 Compiler

日期：2026-10-12，Asia/Shanghai。当前会话自行 Coding，没有委派 Agent 或正式独立 Review。

| 状态                          | 结果                                                                  |
| ----------------------------- | --------------------------------------------------------------------- |
| Coding                        | COMPLETE                                                              |
| 自动验证                      | PASS（当前纯 Compiler / 工程 / CPU oracle 范围）                      |
| 独立 Review                   | NOT_EXECUTED_BY_DESIGN                                                |
| 本步 MZ GUI / 游戏 / 人工视觉 | NOT_EXECUTED                                                          |
| 整体                          | CODING_READY_FOR_REVIEW；统一步骤状态 READY_FOR_REVIEW，尚未 APPROVED |

## 候选与基线

开发基线 `fc407198eefad9336ba97fb9482bdd832ca78f83`；起始主目录为干净 main，origin/main 与实时远端完全一致，已包含 aad1f72 修复和 d834 文档。没有新上游功能变化。当前本地分支 `codex/step-04-mz-compiler`。

**最终受测功能 Commit：`44a5239a979cd549e893df705df7704d043216be`。** 后续文档/证据提交仅包含本报告、需求索引和脱敏 evidence，实际文档 HEAD 由 Git 与最终交付回复给出，不为本文自身 SHA 反复提交。全部发布产物绑定干净 44a5239，文档 HEAD 不能冒充新功能受测对象。

初始功能提交 9a70a43；61eda81 修复 oracle 的 Uint8Array/Buffer 对象类型比较；44a5239 明确最终 Tile 象限的逻辑方向名称，并把样例参数/配方升到 revision2。旧候选构建与失败日志保留。末次只有新契约/样例注释语义改变，没有改历史领域、Profile、Pixel Contract、母版或像素期望。

会话 turn_context 确认 gpt-6.1-sol / xhigh；客户端 service_tier=default。两次原生 UI 读取超时，逐请求与服务端最终 tier 未暴露，均 UNVERIFIED_NOT_EXPOSED。没有切换模型/速度或使用子 Agent。配置证据见本轮目录。

## 实现、契约和调用链

新增 `@tileset/mz-compiler → @tileset/asset-core`，核心无 I/O、Sharp、框架、ORM、浏览器或供应商。九个 workspace 的方向、构建顺序、清理、TypeScript、JS/声明导出和工程产物收集全部登记；没有 TS path alias。原型 CLI 的 tsc 先构建真实依赖，保留原命令。锁文件仅增加 workspace importers，没有升级 registry 依赖。

[STEP_04_BASELINE](../engineering/STEP_04_BASELINE.md) 是 Fragment/Native 输入/错误契约。`compileFragment(unknown, category)` 复用通用硬 IR 校验与冻结快照，之后检查 48 Tile、96×144 源、24 个具名/具角色/24px 对齐区域和 1/2 密度。方向按最终 Tile 象限，不按 MZ 源矩形位置猜测。A1 另要求已记录固定 mask 和原生三帧/四状态/updates/loop/30 更新；A2 静态片段不附加水面目标时基限制。其他通用合法输入返回稳定的 target 不兼容，非法 IR 返回 ir 边界；不会删除帧或改播放语义。

Fragment `mz-compiled-fragment-v1` / Compiler `mz-single-material-v1`：A2 96×144，A1 288×144，相对源帧 x=0/96/192；placement 只有类别、allowed kinds、占用和对齐，没有最终选槽。source 绑定 IR、材质、components、recipe、parameters 和完整精确依赖；摘要绑定元数据及实际像素。元数据深冻结、RgbaImage 私有像素和副本 getter 保证输入 Buffer/共享视图/数组/对象修改不影响交付内容。运行时 Fragment 校验只接受 Compiler 拥有的不可变片段；JSON 是复核描述，不是假装已经执行的编译，可用存档源重放得到拥有实例。

来源规则：旧 Profile 提供 MZ1.10.0、Area、尺寸、支持 kind16/17 与4/6、动画与岸线；已创作 mask 提供固定岸线几何；原生核心提供 floor shape table。新算法负责语义区域重排、三帧相对装排、片段所有权/摘要、形态渲染和目标拒绝。固定诊断工具只执行旧四坐标，没有 Pack 分配器或生命周期。

实际新调用链：原 CC0 fixture → 明确拆分 grass / 三个去除静态岸区的 water / 固定 mask / bank overlay → `encodePng` → `RawSource` → `decodeSource` → `shorelineParameters/shorelineRecipe/processShoreline` → 合法 IR → `buildProcessedAsset` → `compileFragment` → `fixedDiagnostic` → 新 PNG。样例六源的原始 PNG、provenance、exact revisions、参数、配方、处理 PNG、IR、Fragment 和图集均保存；preflight 从这些实际存档源重放，不只相信描述或状态。Built 的 targetCompilation 仍 NOT_EXECUTED。

美术 overlay 从独立原母版的静态区域提取，输出恢复原固定岸线；新诊断按同一 mask 固定 ground 标记，动态区保留 F0/1/2，因此 diagnostic A1 有来源明确的新像素。没有拿旧 PNG 冒充新 Compiler 输出。另有源 quarter 移位9格的样例，证明 Compiler 按方向名称映射。

## 实际自测与口径

| 实际命令/执行                                                    | 结果                                                                                                                  |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| pinned frozen install；`pnpm db:generate`                        | PASS；Node22.21.1 / pnpm10.20.0 / Prisma6.19.3，仅生成 Client，不连 DB                                                |
| 干净候选 `pnpm check`                                            | PASS：九成员方向、Strict、lint、format、17文件 **188/188**、干净 build、七个生产 ESM export maps                      |
| `pnpm test:step04`                                               | 最新稳定源 **44/44**；也包含在上述188内，不相加作为覆盖率                                                             |
| 原公开 `scalars.mjs` 原字节在新构建运行                          | **78/78**，原 script SHA 不变；覆盖与 unit 重叠，不相加                                                               |
| `node scripts/build-engineering.mjs step04`                      | PASS，104 payload、真实 JS/declaration，绑定44a                                                                       |
| `node scripts/build-mz-sample.mjs`                               | PASS，36 payload，其中30 PNG；全部从公开处理链得到                                                                    |
| `node scripts/build-material-sample.mjs` / 原型构建 CLI          | PASS，13合法素材 payload / 四原型PNG与历史一致                                                                        |
| `node dist/scripts/verify-step04.js <合法原生core> <本轮sample>` | PASS，实际新图集的 **960** 次形态/状态/槽位对照、**2,211,840** 像素、**601** updates                                  |
| `node dist/scripts/prepare-step04.js <正版newdata> <本轮sample>` | PASS，新工程，空插件/核心哈希，Map002/003新增空白                                                                     |
| 六项外围负向执行                                                 | PASS：坏哈希、缺A2、正确重哈希后的错误源角色均在建工程前拒绝；重复 sample/engineering/prepare 拒绝且现有构建/工程不变 |

形态口径：47正常连接索引＋单独代表索引47。每套样例检查48×（1草地状态＋4水面播放状态）=240次完整Tile字节，两套共480；三水源帧对应四状态，有重复源1，不把其算第四源帧。oracle 在相同两套内容上另覆盖每类两个诊断槽位，共960次；这些数字是执行次数，不是相互独立的覆盖率。更新逐一核对0..600，含0/29/30/59/60/89/90/119/120及多个周期。正常画笔是否产生某索引只能由 MZ 手绘证明。

独立预期来自保留的手写 quarter 编号数组、方向/红点标记及旧原美术 PNG；不是用新 Compiler 生成 Golden。外部 oracle 使用本机合法且哈希严格匹配的未修改 rmmz_core.js：`4ad828ae6cdd8b526e25591eaffd1ccf5ac4eb753f865f7ff48a0b3c821ff67f`。它在 Node VM 以 PIXI/layer stub 运行原选图/update 定义，读取新 Compiler 的实际 PNG，属于 Coding CPU 自动验证，不是 GPU、GUI、游戏或独立 Review PASS。

DB迁移/真实DB集成/Playwright开发生产冷浏览器及远端CI为 NOT_EXECUTED_THIS_ROUND。本步没有API/Web/Prisma/contracts/Gateway/启动/HTTP改动或新依赖方向；它们不导入 Compiler，既有 unit、安全/真实Vite合成隐私用例已在check执行。没有为形式完整启停或迁移旧数据库；历史DB/browser证据不冒充本轮执行。

开发期失败完整保留：TypeScript literal widening、片段自引用hash、Buffer/Uint8Array比较、注释同步前两项独立像素失败和一次预期source-map差异的盘点假设。修复未删除用例、降低像素阈值或重置母版；最终44/44与188/188通过。详见 evidence development-notes 和原日志。

## 构建与哈希

| Build ID                                        | Manifest SHA-256                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `step04-44a5239a979c-506e303f5d6d3ae3`          | `ab5ae9b605a7ad430a481227059b3290d32fee887e1b179b98da3fe660717cdf` |
| `step04-mz-44a5239a979c-ed3814944c9713b8`       | `066986486f085491ba4fd9be31a3a29ae40eca8cfd7cfd47a611417d644ad131` |
| `step03-material-44a5239a979c-3059a5e34aef3211` | `caa76db8aa4b749a3d946b529f3e714cf6faa3b18dee14a4d2fa81c1a6af778d` |
| `step01-f539ac32f8eac631bb2b`                   | `7e0f9cd40cbf2efb7b2b9c18e0bee9ee7cb40e14c4a10bced22a9a58f5dacff6` |

| 新图集            | SHA-256                                                            |
| ----------------- | ------------------------------------------------------------------ |
| art/A1.png        | `d896c5c8b62816e844865b2abe12a0d5c1694aceb6cd3c75f93eccbd6c55d9d2` |
| art/A2.png        | `7d60ac8c6072d38736e4027cc25fa23979de6e400b9c66d4f586a108506b2b2b` |
| diagnostic/A1.png | `2ceeead6f95091533d9a65211ed350748b5063046301862f125d9777366b80c0` |
| diagnostic/A2.png | `b493ecc86e938dc9aa4f389ba6b1b052222baeade6bb1d58dea7b003126330cd` |

构建实际位于根 `artifacts/<buildId>`；[脱敏样例镜像/Manifest](../evidence/step-04/coding-44a5239/sample/manifest.json) 提供全部源/IR/Fragment/image SHA，工程Manifest提供逐JS/declaration SHA及lock/Profile/契约身份。[证据目录](../evidence/step-04/coding-44a5239/ledger.json) 记录日志、脚本和文件哈希。Manifest 不后补 MZ/Review PASS。

## 验收与下一位 Reviewer

[本轮 MZ 操作指南](../step-04/mz-acceptance.md) 与记录模板已准备。独立工程：`.local/mz/step04-mz-44a5239a979c-ed3814944c9713b8/game.rmmzproject`。打开本工程并核对 step04-build-reference、四PNG SHA、标题与数据库；本轮Map001是程序指定索引图，Map002/003是新空白手绘地图，不能混用旧证据。完整只含原创源/片段/图集/CPU形态参考图及说明的验收 ZIP 见本轮 delivery-reference；正版核心/RTP 不在 ZIP 或 Git。

给 Reviewer：本功能SHA的完整基线差异、STEP_04_BASELINE、Compiler/rules、44个测试及独立 expected、source fixture 构造/存档重放、固定诊断工具、外围 preflight/prepare、四Manifest及ledger。重点检查最终Tile方向与源quarter交换、所有合法/非法目标边界、动画源/状态/timebase区分、不可变所有权、固定mask限制、允许kind与绝对选槽的区别、源到IR到片段真实性、oracle独立性及未执行门禁的表述。若整改改变产物，重新构建并按影响复测。

已知代码阻断：当前自测没有发现未修复项；这不是独立审查无发现。必要剩余技术门禁：新候选独立 Review、指定产物 MZ正常手绘/运行动画/通行及人工视觉、用户指定版本批准。Original Native Host NOT_EXECUTED（最迟步骤10）、旧Map003(4,10) PENDING_USER_EVIDENCE保留。已有esbuild范围限定项、未来HTTP/remote入口预算、当前没有OS/native RSS硬上限均未改变；不能以本轮普通PNG成功推断任意媒体安全。既有Vite chunk>500k提示保留，未因无关优化扩展范围。

保护检查：52个指定旧源码/母版/计划文件、60份旧Map002/003、549个历史artifact文件SHA不变；合法素材13 payload、原型四PNG相同。三个Coding候选的30个样例PNG相同，末次只有六份元数据因语义名称与revision2变化。工程为九个成员，Git既有七个worktrees按inventory保留，没有占用/删除Review或DB工作树。当前 main与实时远端仍fc407198。仅本轮分支提交、可重建dist/dependencies和新ignored本地材料；没有用户工程/凭据变化。单元隐私测试临时服务已退出，无本轮长期API/Web/数据库服务；未启动MZ GUI或Host。

**未正式 Review、未合并、未推送、未创建 PR，步骤05未启动。本轮在Coding ready for Review处停止。**
