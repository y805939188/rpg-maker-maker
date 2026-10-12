# 步骤 02＋03 联合独立复审 — aad1f72

日期：2026-10-12，Asia/Shanghai。独立复审负责人为此前联合 Review 会话 `01a12eeb-0f98-7613-8d6c-160e519ee87b`，没有参与 Coding 实现。本轮只审查、隔离验证及新增报告；未修改生产源码、提交、合并、推送或开始步骤 04。

**结论：新候选已满足步骤 02、03 当前范围的技术要求，可以作为步骤 04 的技术基础。**

| 结论             | 结果                                                             |
| ---------------- | ---------------------------------------------------------------- |
| 实现与跨模块审查 | **PASS**                                                         |
| 独立验证覆盖     | **COMPLETE_FOR_SCOPE**（本轮整改影响范围＋此前完整联合审查基线） |
| 步骤 04 技术建议 | **READY_FOR_STEP_04_TECHNICALLY**                                |

结论绑定功能候选 **`aad1f7223baacd042f43bd6cfbba0619e822b00f`**；文档与证据 HEAD **`d8347372174721df63455dd0c6f4d3a31a6a8267`**。没有新确认的 P0/P1/阻断 P2；GR-0203-001 与 GR-0203-002 均 **FIXED**，既有范围限定 esbuild 非阻断项保留。

**发布边界：远端 main 仍是 `784a39fb9739c01750b4b6cbf5da78df24b227b7`，尚未包含此次修复。** 进入后续开发时应采用上述已复审候选，并完成相应正常合并发布/CI门禁；本报告没有把旧 main 改判为通过，也不授权或启动步骤 04。旧联合报告对784a的 REQUIRES_REVISION 保持历史事实。

## 对象、配置与差异核验

- 新建 detached checkout：`/private/tmp/tileset-global-rereview-aad1f72-20261012`，精确 aad1f72；独立 store/cache/Client/build/probe 输出均在本轮目录。Coding工作区 d834 未改变。
- 当前有效 `turn_context` 实际为 **gpt-6.1-sol / ultra**。客户端全局默认已为 xhigh，但不能用它代替本次实际请求；service_tier配置为default。逐请求/服务端最终tier不可见，保留 **UNVERIFIED_NOT_EXPOSED**。未改变设置；未使用只能声明Priority的子Agent。
- 784a→aad1只有两个功能/测试路径：asset-core四处标量校验及 `global-review.test.ts`。aad1→d834的50个路径均在docs内，无其他功能、测试、锁文件或配置差异。
- 正式plans、AGENTS、Runtime/Profile/Pixel Contract及阶段授权，与本会话此前完整读取和审查的784a基线逐字节相同。沿用[上轮完整联合报告](steps-02-03-global-review.md)的范围和需求矩阵，另实际阅读全文整改报告、完整补丁、正式新测试、公开78断言脚本及索引更新。
- 实际审查判断及重要发现复现由当前Reviewer完成，没有用作者PASS代替结论。

## 两项发现的独立关闭

| 发现/边界                    | 本轮证据与判断                                                                                                                                                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GR-0203-001：Built ID        | `buildProcessedAsset` 在正则前要求原始string，数组/object/number/boolean/null/missing均报BUILD_STATE；上轮可变数组ID原始复现现被拒绝，不再持有数组别名。合法64字符ID仍可Built，65字符拒绝；artifactHash仍只绑定IR内容，NOT_EXECUTED目标边界不变。**FIXED** |
| GR-0203-001：区域名称        | `geometry` 先验证string再按值去重。独立数组名称、重复string均拒绝；真实参数构造链拒绝，正确revision/hash的generic createRevision绕过便利构造器后，processing再验证仍报GEOMETRY。合法具名区域和源/处理像素保持。**FIXED**                                   |
| GR-0203-001：opaque          | ground/water都严格要求`===true`。正确重新哈希的非法标量/缺失字段在IR和Built报IR_SEMANTICS；合法true下实际半透明像素仍独立报IR_ALPHA，未以metadata检查代替像素检查。**FIXED**                                                                               |
| 同类新增检查：assessBuild ID | 公开历史判断入口亦要求string及稳定ID格式。独立数组、boxed string、其他非法类型均报BUILD_STATE；合法历史/新版本可用/显式采用及旧recipe重跑不变。修改范围合理，没有改变合法历史语义。**FIXED**                                                               |
| GR-0203-002：滚动证据索引    | d834的索引已引用历史a0e局部PASS、0793发布及CI，并明确区分784a联合REQUIRES_REVISION和aad1作者完成但独立复审尚未执行的当时检查点；没有改写旧报告/Manifest。**FIXED**                                                                                         |

源码定位为 `packages/asset-core/src/index.ts` 的geometry（515–523）、validateTileIR（572–580）、buildProcessedAsset（724–740）、assessBuild（789起）。变化均为原始标量类型/值约束；领域仍只依赖Node crypto，无新框架或依赖升级。

本轮直接重放上轮自己的原始生产导出复现，六条原非法接纳观察均变为拒绝，18项原合法/拒绝/像素控制仍通过。另由Reviewer增加26项关闭控制，包括双Surface、重哈希IR/Built、generic参数绕过构造器、历史ID、合法ID长度及内容身份。作者78项公开JS脚本在本轮独立checkout也实际重跑通过；不是只读取作者结果。

## 独立复测及产物影响

| 本轮实际执行                           | 结果                                                                                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| pinned frozen install、Prisma generate | PASS，Node22.21.1/pnpm10.20.0/Client6.19.3，本轮store/cache；未连接数据库                                                                |
| `pnpm check`                           | **144/144**，16测试文件；原129含历史五项修复/步骤01测试保留；八成员方向/固定版本、Strict/lint/format、干净build、六个实际生产ESM导出通过 |
| 原始Reviewer复现＋独立关闭控制         | 18原控制通过、六种非法观察均拒绝；26/26独立关闭控制通过                                                                                  |
| 作者公开JS脚本本轮重放                 | **78/78**通过；与原18/26及正式15项存在覆盖重叠，不相加作为覆盖率                                                                         |
| engineering/material/prototype重新发布 | 三份新构建，完整payload和Manifest与Coding候选产物逐字节相同；当前dist全部对应Manifest                                                    |
| 工程与784a比较                         | **86/88 payload相同**，仅asset-core/index.js及source map变化；所有API/Web/contracts/Gateway及其生产输出不变，声明/export/锁文件未变      |
| 合法素材及原型独立像素核验             | material **13/13 payload等于784a**；独立stdlib CRC/inflate/filter解码11PNG匹配原手写literal；原型4PNG bytes/RGBA等于批准步骤01产物       |

三份当前构建：

| Build                                           | Manifest SHA-256                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `step03-aad1f7223baa-d58bd3763fb93c23`          | `b464037e385e6c9b04f81bf952bf34d087735fb96bd2baf8d05a35e5d337cb96` |
| `step03-material-aad1f7223baa-8655597eab0f35b9` | `885a54b2ed76bc5145a6a2de19ec752d859b8ec981c0493959399af813eb44f7` |
| `step01-a597fd2148d556e4854f`                   | `9fb9111178a7d56c01aa091750b03f43349e91c78461c6beb4dc913a9ffc28b8` |

核验作者47个ledger文件、21条实际命令的log SHA及报告/索引SHA，无不匹配；frozen check/runtime/publication/refusal准确绑定clean aad1。旧版反证9失败/6合法对照、公开脚本29失败/49通过及开发期Strict失败均保留，并与当前通过分开，未改成PASS。其旧/新源码和脚本绑定亦已直接检查。

## 覆盖边界与步骤 02、03 的状态

步骤02的工程/API/数据库/运行安全仍由此前完整联合审查的实际DB、开发/生产/冷缓存及故障恢复证据支持。本轮API/Web/Prisma/contracts/Gateway/启动/Vite/依赖未改，并以同一86份未变payload证明应用执行内容不变；完整check内API安全与真实Vite合成隐私回归已重跑。因此本轮**不机械重跑真实DB/browser集成**，不创建/复用/停启旧集群，也不把历史执行描述为本轮执行。

步骤03整改影响的核心字段、真正源→IR→Built链路、原五项修复、合法像素、通用Clip、版本采用/历史、不可变所有权及当前PNG样例均有本轮源码和执行支持。没有发现新的跨模块回归或阻断缺陷。Builtin目标仍是处理IR，`targetCompilation=NOT_EXECUTED`；尚未实现的正式Compiler/Pack/任务持久化/Studio/真实AI不计为缺陷。

本轮新的DB迁移/HTTP集成/三模式浏览器、外部原生核心VM oracle、MZ手绘/游戏/美术验收、新远端CI均为 **NOT_EXECUTED_THIS_ROUND**。对应责任无行为变化，有前述差异及字节/像素证据；这不扩大旧证据的实测对象。新候选发布CI仍由后续发布流程处理。

原装Native MZ Host与Map003(4,10)延期状态、既有esbuild非阻断暴露条件、未来HTTP/remote图片资源预算要求均保留；新候选未新增相关入口或违反延期条件。它们不阻断当前技术建议，也没有被标记为完成。READY只是技术建议，不是V1.0完成或步骤04授权。

## 保护、证据和停止

本轮候选863个tracked blob与固定Git树一致且checkout干净；主/Coding工作区tracked文件、所有既有refs及1004个受保护历史artifact/原Review文件SHA未变。原主HEAD6129、CodingHEADd834及远端main784a保持原样。新增内容仅为本报告、唯一复审证据目录及本轮detached checkout/隔离输出，没有生产整改或调度状态改写。

没有新建数据库、修改私有.env、操作MZ/NW.js/RPGReactor或调用付费模型。unit/privacy服务已结束，相关已知环回端口无监听；隔离依赖和构建保留供复核。原报告和失败材料原样保留。

脱敏证据及逐文件SHA：[本轮ledger](evidence/steps-02-03-rereview-aad1f72-20261012-164031/ledger.json)。原始JSON/脚本作为`.txt`归档，保存实际执行字节；不包含数据库内容、凭据、依赖/cache或正版runtime。

**最终：步骤02、03在aad1f72修复候选上通过本轮独立复审，可以准备进入步骤04；先采用并发布此通过候选，保持后续授权门禁。本轮停止，不开始步骤04。**
