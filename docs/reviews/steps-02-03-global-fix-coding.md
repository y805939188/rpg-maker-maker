# 步骤 02＋03 联合 Review 定向整改 Coding 报告

状态：**CODING_COMPLETE / READY_FOR_INDEPENDENT_REVIEW**。日期：2026-10-12，Asia/Shanghai。本报告是作者实现与自测记录；新候选独立复审 **NOT_EXECUTED**。历史联合 Review 仍对 784a39f 给出 REQUIRES_REVISION / COMPLETE_FOR_SCOPE / FIX_BEFORE_STEP_04，不能由本报告改为 PASS。

## 实际基线、配置与隔离

功能及测试候选：**`aad1f7223baacd042f43bd6cfbba0619e822b00f`**。分支：`codex/fix-steps-02-03-global-review`。工作区：`/private/tmp/tileset-global-fix-20261012`。此功能提交只有 asset-core 实现和新增正式测试两个路径；后续索引、报告和证据作为单独文档提交，不替代该受测功能 SHA。

实际修复基线为 `784a39fb9739c01750b4b6cbf5da78df24b227b7`。开始时原工作区 HEAD 为 `6129b21cc5deb64131b85543d914424ca1c34307`，分支 codex/orchestration-02-03；相对 main 只有三个编排文档/证据路径差异。只读 `git ls-remote origin refs/heads/main` 确认远端仍是 784a39f。其他旧 worktree 均无已跟踪修改；原工作区只有未跟踪联合报告和证据。本轮不回退、覆盖、stash、清理或修改它们，也不修改 canonical steps-02-03-state.json。

本会话 `01a12f2c-ca3f-7382-b2e7-8f8ceb432936` 直接承担用户指定的 Coding 工作。实际 rollout turn_context 为 **gpt-6.1-sol / xhigh**；客户端有效配置为 **gpt-6.1-sol / xhigh / service_tier=default**。逐请求与服务端最终 tier 均 **UNVERIFIED_NOT_EXPOSED**。原生 UI 查询超时，未据此伪造 UI 结果；以可取得的实际 rollout 和配置字段核对。没有修改模型、tier、安全设置或全局工具，没有使用只能声明 Priority 的子 Agent。配置证据为 `client-configuration.json`。

修改前阅读完整 AGENTS、MZ_RUNTIME_ENVIRONMENT、两份正式 plans、联合 Review 及 GR-001 原始 probe/results/confirmation/full ledger、STEP_03_BASELINE、完整 asset-core 领域契约、Pixel Contract、需求索引；阅读相关现有领域/配方/像素与历史五项整改测试、步骤 03 Coding/整改/第二轮独立 Review/发布记录。构建与验证脚本的真实副作用已核对。隔离路径不在任何 `.local` 父目录内，没有放宽 Vite 文件访问政策。

## GR-0203-001 三种表现

| 表现           | 根因、修复及领域错误                                                                                                                                                                                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Built ID       | 正则隐式把数组、boolean、null、undefined 转成字符串；数组可通过格式检查并被浅冻结 Built 持有。`buildProcessedAsset` 在正则前要求 `typeof id === 'string'`，非字符串按既有 BUILD_STATE 拒绝，随后仍执行既有格式、状态、IR/hash 校验。数组在构造时拒绝，没有冻结非法数组或强制字符串化。 |
| 区域名称       | 正则会接受独立的 `['same']`，Set 却按数组引用去重。`geometry` 在格式及唯一性判断前要求原始 string，合法字符串按值去重；非法类型和重复合法名称均报 GEOMETRY。几何、覆盖和像素规则不变。                                                                                                 |
| Surface opaque | ground/water 使用 truthiness 接纳 `'false'`、1、[]、{}。固定岸线 hard IR 的两处改为 `=== true`，不合法值报 IR_SEMANTICS；实际像素 Alpha=255 检查仍独立报 IR_ALPHA。这里只证明非法元数据曾被接纳，没有观察到透明 PNG 或图集损坏。                                                       |

`artifactHash` 仍为 `ir.contentHash`，没有对整个 Built 包装对象重新哈希；不同合法 Built ID 可有相同 IR 内容哈希。`targetCompilation` 仍为 NOT_EXECUTED。合法 IR 的 hash、引用、像素及状态校验、所有权深拷贝和冻结保留。

## 有限同类字段检查

检查了 asset-core 的全部公共构造器/验证器中的 ID、名称、角色、枚举、字符串哈希、布尔和依赖隐式转换的条件。原始 source/revision 的 id/hash 已有 typeof string；revision kind、source role/encoding、provenance origin、style lighting/outline、animation timebase、region role 使用严格 `includes`；IR contract/material kind/transition strategy/boundaryOwner 使用严格相等。IR material ID 必须等于合法 component ref 的 string ID，且 component ref 必须匹配已验证的 exact dependency。整数/密度/坐标/帧索引使用 Number 的严格数值检查。`animationClip.loop` 已有 typeof boolean，合法 false 保留。

直接相关新增漏验：公开历史验证入口 `assessBuild` 原来从不检查 Built ID，`assessBuild({...legalBuilt,id:['history']}, catalog, dependencies)` 在 784a39f 上返回正常历史判断。按既有 Built 稳定 ID 格式补同样的 string＋正则检查，使用既有 BUILD_STATE；没有改变合法历史/采用语义。旧 JS 反证还覆盖 object/number/boolean/null/missing ID。它属于同一 Built 公共边界的身份合法性检查，作为本轮 Coding 扩展关闭主张交给独立 Reviewer 确认。

没有发现需要改变批准语义或架构的其他同类修复。纯比较/选择函数不冒充构造器；像素字节的 truthiness 不属于 metadata boolean。没有引入万能验证框架、Zod/Nest/Prisma/Provider SDK 或依赖升级，asset-core 仍仅依赖 Node crypto。

## 回归与旧版本反证

新增正式测试：`packages/material-processing/tests/global-review.test.ts`，通过构建后的 `@tileset/asset-core` 和 `@tileset/material-processing` 公开导出调用目标函数。沿用合成合法 fixture，保留独立手写 expected。普通非法类型通过显式测试 cast 进入运行时，不靠 TypeScript 拒绝来计成功。

拒绝覆盖数组/object/number/boolean/null/missing Built ID、格式错误 string；两份独立数组名称、其他非法名称、重复 string 和不同合法 string；岸线参数入口及正确 revision/hash 的 generic createRevision 绕过便利构造器后 processing 再验；ground/water 两处 `'false'`、1、[]、{}、false、null、缺失；合法 true 与不透明像素；合法 true 下半透明 ground/water 像素仍被 IR_ALPHA 拒绝；合法 ID、metadata/pixel 所有权和既有内容哈希；通用 loop=false 及非法 enum/loop 控制。

每个变更 IR 的拒绝样例都用公开 tileIRHash 重算，缺失 opaque 删除字段后再重算；源/ref/hash/参数闭包先由完整合法配方建立。拒绝断言检查 AssetError 及目标 code，不能用提前发生的 IR_HASH 或无素材错误算关闭。

旧版本环境为本轮新建 detached `/private/tmp/tileset-global-fix-negative-20261012`，固定 784a39f。只新加同字节 regression 文件，已跟踪源码 diff 为空；独立 node_modules 使用本轮 owned store，构建其旧公开 JS exports。没有修改 Reviewer 冻结 checkout。

| 同字节验证               | 784a39f 旧实现                           | aad1f72 新候选           |
| ------------------------ | ---------------------------------------- | ------------------------ |
| 最终正式 regression 文件 | 实际 exit1，9 失败／6 控制通过           | 完整 check 内 15/15 通过 |
| 公开 JS `scalars.mjs`    | 实际 exit1，78 条断言中 29 失败／49 通过 | 实际 exit0，78/78 通过   |

旧版失败是“必须拒绝却未抛异常”，不是成功复现被误标为实现 PASS。78 条是脚本断言数，15 条是 Vitest 参数化测试数；两者覆盖相互重叠，不相加作为覆盖率。最终 regression SHA 为 `0a83b14c12a43ff87f7a89aaff387ca4fa0f51833bf1bf95f209e587ed65ca7f`；公开脚本 SHA 为 `506ec056e7eecde0410e7f05093531ed3d62a5f83b7a2d61482ef662c6c801b9`，旧/新执行字节均核验一致。`red-green-binding.json` 和 old-final-regressions/frozen-runtime 日志保存绑定。

开发期曾有一个测试数组→string cast 的 Strict 编译错误，已改为显式经 unknown 进入运行时并重跑最终同字节旧测试。draft-typecheck.log 保留失败；未修改生产校验或删断言来掩盖。最初安装被隔离目录继承的 Node22.14.0 拒绝，指定现有22.21.1后 frozen install 成功，未升级或改全局 Node。

## 冻结候选实际验证与未执行项

[新证据目录](../evidence/steps-02-03-global-fix-aad1f72-20261012/) 保存真实命令、clean SHA、argv、UTC 时间、退出和日志 SHA（commands.jsonl.txt）。全部冻结运行在 clean aad1f72 上；之前 dirty 开发日志明确区分。

| 实际命令/检查                               | 结果                                                                                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| pinned frozen install；pnpm db:generate     | PASS；新 owned store/cache 和生成 Client，无数据库连接/迁移                                                      |
| `pnpm check`                                | PASS：144/144、16 文件；八成员边界/固定版本、Strict含tests、Lint、格式、干净正式 build、六个公开生产 ESM imports |
| `node .local/global-fix/scalars.mjs`        | PASS 78/78，绑定 clean aad1f72                                                                                   |
| `pnpm build:engineering`                    | PASS；脚本默认标签仍 step02，当前含八成员/88 payload，不能称为历史步骤02的70文件重现                             |
| `node scripts/build-engineering.mjs step03` | PASS；相同干净 dist 的显式 step03 工程证据                                                                       |
| `pnpm build:material-sample`                | PASS；真实 PNG→owned validated sources→固定 recipe→hard IR→Built→11 PNG 导出，13 payload                         |
| `pnpm prototype`                            | PASS；步骤01诊断/美术四 PNG 新构建                                                                               |
| stdlib artifact/CRC/inflate/filter verifier | PASS；Manifest、全部逐文件 SHA、当前 dist 对应、11 sample literal planes、原型 bytes/RGBA                        |
| 四个 publication 入口重复运行               | 均预期 exit1；197 payload/Manifest 文件保持原样，无 stage/lock 遗留                                              |

原129测试全部保留并通过，包括52项步骤01、稀疏数组、参数依赖、同源身份、overlay源调色板及可达帧变化回归。新增15项全部通过。合法草地/三源水帧/固定岸线、像素预期、0→1→2→1播放与源帧分离、grass@4可用性/显式采用/grass@3历史VALID保持；公开脚本还重验拥有字节副本和按旧 recipe 再跑同 hash。

DB迁移/真实HTTP集成/开发生产冷缓存浏览器端到端：**NOT_EXECUTED_THIS_ROUND**。理由：API/Web/Prisma/contracts/Gateway/启动/Vite 文件政策未改，API/Web不导入此次领域模块；工程输出证实这些 payload 全部与784a39f一致。完整 check 内现有 API unit/security 与 Vite synthetic privacy tests 已真实重跑，不能冒充 DB/browser 新执行。不创建数据库、私有.env或长期服务，不触碰旧55432/55433/55434/55439集群，也不机械重置历史数据。

新增 MZ 手绘、游戏/原装 Host、美术验收和外部 native-core VM oracle：**NOT_EXECUTED_THIS_ROUND**。本轮未改原型/Profile/Pixel/母版/合法PNG，以原52测试和四PNG bytes/RGBA比较证明受影响步骤01无回归；历史VM/实机结果仍仅是历史证据。Original Native Host、Map003(4,10)待补等既有门禁保留。没有执行新 dependency audit，既有 scoped esbuild 非阻断项未改变；不宣称全局 audit clean。远端 CI、独立复审、main merge/push及步骤04：**NOT_EXECUTED**。

## 新构建、哈希与 payload 比较

所有 Manifest 绑定完整 aad1f72 SHA、clean tree、锁文件、Profile `1.0.0-candidate.1`、Pixel `rgba8-srgb-integer-v1`、相应契约及逐文件 SHA。Material实际 codec 为 Sharp0.35.5/libvips8.18.7；Manifest/validation 未被补写 PASS。

| Build ID                                      | Manifest SHA-256                                                 |
| --------------------------------------------- | ---------------------------------------------------------------- |
| step02-aad1f7223baa-23b2e4279b331cba          | 8fbaca29f55671333d029d75ee47c2e7bcdc5206bd5fb9610d7e158704b2991f |
| step03-aad1f7223baa-d58bd3763fb93c23          | b464037e385e6c9b04f81bf952bf34d087735fb96bd2baf8d05a35e5d337cb96 |
| step03-material-aad1f7223baa-8655597eab0f35b9 | 885a54b2ed76bc5145a6a2de19ec752d859b8ec981c0493959399af813eb44f7 |
| step01-a597fd2148d556e4854f                   | 9fb9111178a7d56c01aa091750b03f43349e91c78461c6beb4dc913a9ffc28b8 |

`artifact-verification.log` 保存全部 payload hashes 和独立 RGBA hashes，四份原字节 Manifest 快照随证据归档。功能/测试提交不含 artifacts；完整新构建保留于隔离工作区 artifacts。原始日志末尾空行保持实际执行字节；完整 staged whitespace 检查因此报告六份新日志的 blank-at-EOF，代码、索引和本报告的 whitespace 检查另行通过，未为消除样式提示改写日志。

允许变化的是源码 commit、Build ID、Manifest 包装身份，以及新增拒绝代码对应的工程 JS/source map。实测两个工程构建相对784a工程：**86/88 payload逐字节相同**，仅 `packages/asset-core/dist/index.js`（新 SHA `5633830a8debb42fb460dddc194b8e88fbeb43b83979a7b12c02da5501a3a82e`）及其 source map变化；公开 `.d.ts` 不变。

应保持不变的合法素材实测全部一致：material **13/13 payload** 等于 `step03-material-784a39fb9739-5c1c1e8a30c43896`，包括全部11PNG、tile-ir.json和revisions.json。sample IR artifactHash 保持 `ed56163d505bd9cccb636ccb954830edde918fd5c3a33260306b659677c6a5ad`。独立 stdlib PNG 解码全部11平面等于原手写 expected。原型四PNG逐字节及RGBA等于784a构建，也等于批准 `step01-56368269c8328e0f84b9`：de08f8bc…b337f、b493ecc8…330cd、d896c5c8…5d9d2、7d60ac8c…b2b2b。没有更新 Golden 或用新像素替换历史。

## GR-0203-002 索引更新

`V1_REQUIREMENTS_EVIDENCE.md` 已纠正“独立第二轮待执行”和“PNG policy Review待完成”的滚动状态，引用真实历史 a0e9f07第二轮PASS、0cf7aa0文档候选、0793c94发布及main CI。另保留784a39f联合审查REQUIRES_REVISION、两项新finding、本轮aad1f72 Coding结果和**新独立复审尚未完成**。历史原始报告、失败复现和不可变Manifest均未改写。本轮作者完成不能关闭独立finding或授权步骤04。

## 修改范围、保护与交接重点

正式改动文件为 `packages/asset-core/src/index.ts`（四个现有边界的标量约束）、`packages/material-processing/tests/global-review.test.ts`（正式回归）、`docs/engineering/V1_REQUIREMENTS_EVIDENCE.md`（滚动索引）、本报告与唯一新证据目录。没有修改依赖/锁文件、package exports、方向政策、已批准产品范围、两份plans、Profile/Pixel Contract、原型或母版；没有实现步骤04内容。作者的Frozen source身份与后续doc HEAD差异须按这两类提交核对。

完整原始联合Review仍在原工作区原路径、未跟踪且未变字节。本轮选择归档原始报告、关键probe/results/confirmation、完整历史ledger和配置的原字节快照；其余HTTP/browser等原材料留在原路径，全部59个ledger文件已核验。`original-selection.json`明确此为选择性复制，历史full ledger不是此选集的inventory。不提交原.env、DB目录、cache、正版runtime、无关截图或其他会话产物。

独立Reviewer重点：在独立checkout重跑合法fixture及最终拒绝断言；核对三个GR-001表现、额外assessBuildID边界、真实重哈希后IR_SEMANTICS/IR_ALPHA、合法hash/ownership/history、两个工程变化路径及13+4合法payload一致性；核对索引准确区分历史局部PASS、旧联合REQUIRES_REVISION和新候选未复审。最后判断阻断项是否关闭；本报告不替代独立判断。

冻结自测结束时候选863个tracked文件hash不变、Git clean；四份新构建197文件拒绝重发后不变。结束工作区/旧材料保护结果另见 `workspace-after.json`：主工作区与旧refs、受跟踪文件、原Review证据、1357个历史artifact文件均按开始快照核验；旧Reviewer checkouts不动。修复和negative worktree、own依赖/cache及新构建保留供复核。未创建DB或长期进程；环回服务监听状态已复查，无本轮残留服务。后续文档提交只添加上述说明和证据，本轮停止等待独立Review。
