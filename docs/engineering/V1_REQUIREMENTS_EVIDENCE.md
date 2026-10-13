# V1 产品要求 → 步骤 → 验证 → 证据

正式要求来自保留的 V0.5 产品方案与十步计划。步骤 02 开始维护；每个候选的正式 coding/review 报告与 evidence 绑定 commit/hash。下表不把未来能力或历史部分实机结果当成完成。

| 要求                                          | 步骤      | 验证方式                                              | 当前证据/状态                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------- | --------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 原生草地/水面/固定岸线、48px/Area/三源帧/时基 | 01、03–05 | 黄金图、原生核心 oracle、编辑器手绘/游戏              | step-01-authorization.md 阶段批准；Original Native Host NOT_EXECUTED；Map003 证据待补                                                                                                                                                                                                                                                          |
| 前后端/数据库/模块格式工程闭环                | 02        | Strict/lint/test/build；开发及生产真实 DB→HTTP→浏览器 | [step-02-fix-round-3-coding.md](../reviews/step-02-fix-round-3-coding.md)：冻结 5356d66，自动工程/DB/浏览器/隐私/补丁 codec 回归 PASS；第四轮独立 Review PASS；main c021b20 已发布，两次 CI SUCCESS                                                                                                                                            |
| 来源像素、固定配方、不可变依赖与素材状态      | 03        | 像素/Alpha/几何/配方版本测试                          | [历史第二轮独立 Review](../reviews/step-03-independent-round-2.md) 在 a0e9f07 上 PASS，关闭历史五项；0793c94 已发布。784a39f 联合 Review 的阻断记录保留；[最新联合独立复审](../reviews/steps-02-03-global-rereview-aad1f72.md) 对 aad1f72 PASS，GR-0203-001/002 FIXED；修复已发布至 main源码检查点9fb02c9，候选与main CI SUCCESS               |
| 正式 MZ Fragment、全形态及帧结构              | 04        | 结构穷举、独立字节期望、原生核心oracle、MZ阶段验收    | 44a5239；[独立技术Review PASS](../reviews/step-04-independent-review.md)；随后用户在Native Core＋Modified NW.js报告并补齐地图/岸线/动画/通行阶段证据，见[步骤05基线引用](../evidence/step-05/coding/step04-stage-baseline.json)。不升级为Original Host PASS；本地未合并/推送                                                                   |
| 多素材 Pack、稳定槽位/退役、Manifest/导出     | 05–06     | 冲突/容量/退役、实际PNG与依赖复核、旧手绘地图替换     | c09027f原独立审查支持Pack/图集及验收材料，但STEP05-IR-001为阻断P2；[第一轮整改](../reviews/step-05-fix-round-1-coding.md)候选ad669a0修复四入口，作者225测试（含15新增）/37步骤05/78旧JS、八套Pack/16PNG、3600CPU检查PASS。56产物文件不变，既有人工PASS_USER_REPORTED可按影响复核引用；当前READY_FOR_REVIEW，新候选独立Review未执行，未阶段批准 |
| 项目/素材 revision、不可变发布与并发保护      | 06        | 故障注入/CAS/迟到完成/文件 DB 一致性                  | NOT_EXECUTED；步骤 02 最小 Project 表不是完整持久化                                                                                                                                                                                                                                                                                            |
| Mock 提交未知、重启查询、归档失败及本地取消   | 02、06    | 02 契约/快照；06 Mock runner 故障测试                 | 8a7d4b9 契约/快照测试 PASS；完整恢复 NOT_EXECUTED                                                                                                                                                                                                                                                                                              |
| 同一快照备份恢复后重新编译                    | 06        | 干净 DB+文件恢复并重新构建                            | NOT_EXECUTED                                                                                                                                                                                                                                                                                                                                   |
| 人工素材完整工作流、创作与实际图集动态预览    | 07、10    | 浏览器导入→编译→预览→下载；MZ 时基                    | NOT_EXECUTED；步骤 02 Pixi 壳不是交付预览                                                                                                                                                                                                                                                                                                      |
| QA 问题定位、静态区域保护、修复/重生成        | 07、09–10 | 接缝/动画/局部保护与重建回归                          | NOT_EXECUTED                                                                                                                                                                                                                                                                                                                                   |
| WaveSpeed 文本生成/参考图编辑与本地归档       | 08–09     | 两条受控付费真实连通和调用记录                        | NOT_EXECUTED；本步没有付费调用                                                                                                                                                                                                                                                                                                                 |
| 平台主 Prompt、可选补充、默认模型和模板冻结   | 02、08–09 | 快照隔离；空补充/冲突/换默认配置/模板评测             | 8a7d4b9 类型/快照 PASS；真实 Composer NOT_EXECUTED                                                                                                                                                                                                                                                                                             |
| 文字/参考图整套 Pack 与候选/修复              | 09        | 完整 Pack 成功率、MZ/保护区验证                       | NOT_EXECUTED                                                                                                                                                                                                                                                                                                                                   |
| 正式质量、成本、阈值/保留集、UX 和发布        | 09–10     | 预先批准阈值、独立 Review、完整 MZ/用户验收           | NOT_EXECUTED                                                                                                                                                                                                                                                                                                                                   |
| local-first 安全、无密钥/本地路径泄露         | 02、10    | Host/Origin/写请求/体积/错误/上传边界测试             | 两项 Vite P1 经第三轮独立 FIXED；5356d66 补丁 codec/EXIF 门禁 PASS，独立第四轮 PASS；步骤 03 有界 PNG policy 已随历史 a0e9f07 第二轮独立 Review PASS；784a39f 联合审查重核该政策并另发现领域标量阻断项；当前无上传，最终安全仍需步骤 10                                                                                                        |

独立 Review、用户或预授权 Orchestrator 批准、STRUCTURAL_PASS、人工视觉、手绘地图和游戏运行分别记录。后续更新只增加真实证据引用，不改旧不可变 Manifest 的门禁结果。步骤 03 发布后本轮停止，步骤 04–10 未授权。

当前审查检查点（GR-0203-002 文档整改）：

- 历史局部第二轮 PASS 绑定 `a0e9f07ae26567c3a623a2b38e42b0b015441d30`，作者文档候选 `0cf7aa049137cae6c9367231a141ffcb04df97a9`；[步骤 03 发布记录](../orchestration/step-03-release.md) 保存 `0793c948da3bf3a8967579253f27ab2e234b8e70` 发布及 main CI SUCCESS。该历史事实保留。
- [联合 Review 原文快照](../evidence/steps-02-03-global-fix-aad1f72-20261012/original-review/steps-02-03-global-review.md.txt) 绑定 `784a39fb9739c01750b4b6cbf5da78df24b227b7`：实现 REQUIRES_REVISION、验证覆盖 COMPLETE_FOR_SCOPE、建议 FIX_BEFORE_STEP_04，发现 GR-0203-001（阻断 P2）及 GR-0203-002（非阻断 P3）。COMPLETE_FOR_SCOPE 不代表全部断言通过。
- 本轮功能候选 `aad1f7223baacd042f43bd6cfbba0619e822b00f`：完整 check 144/144、生产 JS 断言 78/78、合法样例 13 payload 与原型四 PNG 保持一致；[Coding 报告](../reviews/steps-02-03-global-fix-coding.md) 及新证据记录旧版本反证和新构建。该作者检查点为 CODING_COMPLETE / READY_FOR_INDEPENDENT_REVIEW；其后[最新独立复审](../reviews/steps-02-03-global-rereview-aad1f72.md)已对精确aad1f72返回PASS，修复发布至9fb02c9且候选/main CI SUCCESS。历史联合Review结论未改写，步骤04仍未授权。

当前发布入口：[维护记录](../orchestration/pre-step-04-repository-maintenance.md)。9fb02c9为已完成源码发布检查点；文档维护后的实际最终main以Git和对应CI为准，不为自引用SHA反复改文件。

当前步骤04 Coding检查点（2026-10-12用户新授权）：本轮明确允许当前会话自行实施步骤04，覆盖旧文档中的此前停止边界。仅Coding/测试/本地候选与验收准备，无独立Review、Merge、Push或步骤05授权。最终受测功能SHA `44a5239a979cd549e893df705df7704d043216be`；当前技术状态READY_FOR_REVIEW，尚待独立审查、本步真实MZ门禁与用户批准。原装Host及旧Map003延期事实不变。

历史步骤05 Coding提交检查点（2026-10-13用户新授权）：功能候选 `c09027f921e7d67469b301083db89acc44433d9e`，从已复审步骤04本地候选及文档HEAD启动，不从旧main重做Compiler。完整报告、冻结构建、实际命令与两类MZ材料见上述步骤05入口。仅Coding/自测/准备/本地提交；统一状态READY_FOR_REVIEW，独立Review NOT_EXECUTED_BY_DESIGN，步骤05MZ NOT_EXECUTED，无Merge/Push/PR，步骤06未启动。旧停止文字及原装Host/Map003延期记录作为历史事实保留，不据此伪造通过。

历史步骤05独立审查检查点（2026-10-13）：功能候选 `c09027f921e7d67469b301083db89acc44433d9e`、受审文档HEAD `ed189f7c274a7f397d261630bae396abb456665d`；[独立报告](../reviews/step-05-independent-review.md)与[认可项登记](STEP_05_BASELINE.md#原候选独立审查检查点2026-10-13)分开记录已获支持部分和阻断项。整体REQUIRES_REVISION，覆盖COMPLETE_FOR_SCOPE，统一状态CHANGES_REQUESTED；四发布入口目录归属缺陷STEP05-IR-001待下一轮Coding修复与回归。成功产物、ZIP/旧地图材料可用不等于阶段批准；步骤05MZ NOT_EXECUTED、步骤06未启动。此次仅更新文档并保存既有独立报告/脱敏证据原字节，没有修改生产代码/测试或后补旧Manifest PASS。

当前步骤05整改检查点（2026-10-13）：受测功能 `ad669a06218b6cf775f32b8333d75d9dd3f9186f`；四入口归属修复与完整复测完成，状态READY_FOR_REVIEW，STEP05-IR-001仅记IMPLEMENTED_AND_SELF_TESTED_PENDING_INDEPENDENT_REVIEW，不修改原REQUIRES_REVISION报告或旧Manifest。用户人工观察已于2026-10-13记录PASS_USER_REPORTED，截图/录像未提供、原装Host延期；本轮确认PNG/布局/来源等56文件不变并引用既有观察。下一门禁仍是新候选独立PASS与用户批准，步骤06未启动。

当前步骤06 Coding 检查点（2026-10-13，本轮授权覆盖旧停止文字）：

| 要求                                              | 最终候选作者证据                                                                                       | 边界                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| 源/不可变 revision、配方/依赖、通用 IR 与真实恢复 | a2878a9；公开230测试含通用 RGBA 重放；DB 独立实例/备份后的实际 IR 恢复                                 | 原 PNG/RGBA 字节、像素独立；IR 与 MZ 编译引用分开；不以标签伪造拥有对象         |
| Pack/Slot 完整历史与退役                          | 真实 DB10项、恢复后重新 Build；8套 Pack 的56 payload 与批准步骤05相同                                  | 历史与当前/CAS 分开；RETIRED 不复用、不清空；Profile/Compiler 语义未变          |
| 文件固化→短事务→CAS/失败保护                      | 实际半写 SIGKILL、前后 COMMIT SIGKILL、PostgreSQL 延期触发器在 COMMIT 拒绝、反向完成/同旧槽位争用      | 缺失/半文件不进入成功指针；DB 失败可定位孤立文件；重复身份不重复记录            |
| Mock 提交未知/重启/归档/取消/冻结                 | 真实新 Executor/Provider 实例、子进程 kill/重启；ID/attempt/归档分别保存                               | Unknown 不盲重提；归档失败只重试归档；本地取消非供应商取消；无 SDK/Key/付费模型 |
| 一致 DB+文件备份恢复                              | 新专属 fixture DB 真迁移、写入暂停、pg_dump/文件 SHA、空 DB/文件根恢复、源/通用配方/完整 Pack 实际重建 | DB/资产根/端口在 evidence 记录；原数据/失败现场保留；已提交/未知不当新请求重提  |
| 旧工程与浏览器/生产 JS                            | check230、integration3、两模式 browser1+1、10 exports、165文件绑定工程构建                             | Web 仍 contracts-only 旧壳；步骤07 Studio、上传和交付动画预览未启动             |

完整命令、失败保留、Build 与哈希见 [步骤06 Coding 报告](../reviews/step-06-coding.md)、[基线](STEP_06_BASELINE.md)、[命令](../evidence/step-06/coding/commands.json)。状态最多 **READY_FOR_REVIEW**；独立 Review/远端 CI 未由 Coding 执行，未批准、合并或推送。新 GUI/游戏/美术及 Original Host NOT_EXECUTED；既有步骤05独立 PASS/用户观察和延期边界保持。Main 唯一管理 orchestration 状态；Coding 未修改该状态文件。

步骤06第1轮独立Review整改检查点：原a2878a9/bae为 REQUIRES_REVISION；IR-001 gate lifetime、IR-002精确reference revision、IR-003正式CLI资产根和IR-004工具日志可搬运性已在 `debcce716e5b563eec881eb24eaa41aebcccac30` 实施并作者复测。原Report SHA `a983e4a763801ee83a74afccfc9e71fece162a255092fe898ba6f99ebb5b5fa4` 和旧ledger不改写。新增真实pg_terminate_backend仅终止本实例明确持有的锁会话，维护独占后不再submit/固化/登记；已有可能请求保留UNKNOWN；scope事务fencing与exclusive备份失锁、同字节精确rev1/rev2/PG最大值及负控制、恢复后的选择、正式CLI自定义root read/rebuild/Mock均进入已有CI命令。作者冻结check230、DB16、API3、browser1+1、JS78、标准56payload/16PNG哈希通过。新证据/命令见 [整改报告](../reviews/step-06-fix-round-1-coding.md)及 [fix-round1](../evidence/step-06/fix-round1/commands.json)。本记录仅 SELF_TESTED_PENDING_ROUND2 / READY_FOR_REVIEW；下次正式第2轮，未IndependentPASS/批准/发布，步骤07未启动，Main canonical状态未写。

## 步骤07最新作者候选（2026-10-13）

source `4f6a40f3e8be990b4068dafee488249be737f7ad`，**READY_FOR_REVIEW**；上文历史检查点不改写。06发布/R3独立PASS及本轮06–07授权覆盖历史停止文字，07作者不能自行IndependentPASS或发布，08–10未启动。

| 要求                                            | 当前作者证据                                                                                                                  | 边界                                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 人工完整Studio / 精确版本 / 固定配方 / 标准下载 | 两模式真实浏览器导入→采用→构建→预览→ZIP；源/配方/历史刷新可读                                                                 | 无AI/Key/模型选择/DB或内部JSON操作                                         |
| 实际交付与创作Pixi / MZ逻辑时钟                 | 原源Pixi像素、8组交付Canvas独立母版scene逐像素、pinned native-core矩形；fixed60/30 updates                                    | 编号/原创母版不重置，CPU/browser不冒充GUI/用户美术                         |
| 标准八文件 / Profile / 历史与retired            | mz-pack-build-v1实际8file重读；完整Profile嵌入Manifest，PNG/预览/ZIP同Export；56旧payload/16PNG SHA不变                       | 06四文件不冒充正式导出；旧构建POST转换不改current或原Manifest              |
| 构建/任务/current失败保护                       | 7项HTTP/PG包含真实延期COMMIT拒绝、同内容不同ID、CAS/late/retired；06完整23项回归                                              | 新job完成与Build/Export/CAS同TX，不回退last success                        |
| 一致备份恢复 / Studio读回与再建                 | 新空DB/root公开restore后真实再建；恢复实例浏览器current/history/旧ZIP一致                                                     | private dump/.env/runtime不入库，未reset已有环境                           |
| 新HTTP入口 / 资源与路径保护                     | 4MiB PNG、独立JSON8KiB、真实format/metadata/pixel/density/read/codec timeout/cancel/concurrency/cleanup；真实Vite privacy保持 | 旧无上传豁免取消；heap128MiB≠OS/native RSS硬上限，实测保留                 |
| QA risk / 验收状态分离                          | 硬校验聚合、seam/repetition/color/flicker/low-animation定位与阈值；人工视觉追加记录                                           | 单指标非质量，Profile阶段基线非ARTIFACT_MZ_TESTED；本产物MZ/用户美术未执行 |

完整 [Coding报告](../reviews/step-07-coding.md)、[基线](STEP_07_BASELINE.md)和 [ledger](../evidence/step-07/coding/ledger.json)绑定上述唯一最新candidate。工程238、API3、07真实HTTP7、06 PG23、两browser各2及11生产exports通过；远端CI/Independent Review未由Coder执行，Main管理canonicalstate。

## 步骤07正式R1整改检查点

上述初始07记录保留为历史。正式R1/5为REQUIRES_REVISION，原报告SHA `96fd739b24d4bfac0e937f695eb5469591d570780d4b3fc7bd0ae3e824820686`不改写。最新source `d343171ca866a8d1d1c4e272823ef475229d8032`，**READY_FOR_REVIEW / SELF_TESTED_PENDING_ROUND2**，下一次正式2/5；作者不自行IndependentPASS、批准、发布或写Main canonical。

| 要求 / R1问题                                         | 最新作者证据                                                                                                                                                      | 责任与局限                                                                                     |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| §13.2资产root边界 / STEP07-R1-001 P2 BLOCKING         | 共享逐层路径、root dev/ino、O_NOFOLLOW/fd身份及前后复核；15新增文件case；真实source/A1/JSON/ZIP等同SHA祖先链接422，普通/恢复200；真实坏restore父目录无文件/DB写入 | 保持SHA/bytes与合法历史；合作式不可变目录协议，不声称任意秘密泄露、HTTP种链接或防恶意管理员ABA |
| §4.1/4.4项目/产物身份 / STEP07-R1-002 P3 NON_BLOCKING | data.projectId及Build/recipe成员检查；加载时旧资源不渲染；两模式真实延迟/legacy转换/反向切换，共74/94响应无400+                                                   | 最小状态协调；非阻断原分级保持，无新交互架构/美术打磨                                          |
| 06–07完整持久/恢复/素材与资源政策                     | 新候选check253、HTTP8、06 PG23、API3、privacy5、两browser各3、11exports、旧56payload/16PNG、JS78、8原生CPU对照及真实恢复browser                                   | 不借旧4f PASS；原预算/失败/Profile/母版/Compiler/Pack语义不改，native CPU非新artifact MZ实机   |

精确source/docs/工程Build/Export/关键hash、原反例和新验证见 [R1整改Coding报告](../reviews/step-07-fix-round-1-coding.md)与 [新ledger](../evidence/step-07/fix-round1/ledger.json)。IndependentReview/CI/Release NOT_EXECUTED_BY_CODER，实际产物MZ/用户美术及既有延期仍NOT_EXECUTED，08–10未启动。

## 步骤07正式R2整改检查点

正式R2/5为REQUIRES_REVISION，原报告SHA `1411559d5e0d8376ef34caae414f643392b63b59ad45d59c36363fdf9f200a6d`、386证据保留。最新source `5d926ad7ad6a68bfaff7ea2a51d4d3859c95d7c0`，**READY_FOR_REVIEW / SELF_TESTED_PENDING_ROUND3**；正式已用2/5，下轮3/5，不重置。作者不独立关闭发现、批准、发布或写Main canonical。

| 要求 / R2问题                                      | 最新作者证据                                                                                                                                                             | 责任与局限                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| §4.4/§7真实任务状态 / STEP07-R2-001 P2 BLOCKING    | poll本次settle后800ms再排，同项目单inflight；两模式1300ms合法慢成功/失败、快控制、旧请求迟到，UI终态/按钮与实际backend一致                                               | 保留project/revision/generation与取消保护；不靠用户刷新或增大原case时限                      |
| §4.4/§11.3创作处理预览 / STEP07-R2-002 P2 BLOCKING | project/recipe/frame可取消PNG，descriptor协调、5attempt/60s BUSY-only恢复、明确错误/重读；两模式三次无注入普通切换、三源帧、真实槽压力/取消与PNG decode/SHA/RGBA一致     | 保持native1/等待1/codec5s/close后释放、HTTP预算和R1路径；无无限队列/重试或永久隐藏必需预览   |
| 06–07持久恢复/真实双预览/标准包                    | source冻结check263、HTTP9、PG06 23、API3、privacy5、browser7+7；206工程文件、旧56payload/16PNG、JS78、8 CPU；干净恢复后source/recipe/current/history/rebuild/PNG/ZIP连接 | 同选定Export、完整Profile hash48844001…、四/八文件分层；CPU/作者截图非用户美术或新MZ实机PASS |

精确source/docs/Build/Manifest/逐项SHA、原失败与实际资源见 [R2整改Coding报告](../reviews/step-07-fix-round-2-coding.md)与 [ledger](../evidence/step-07/fix-round2/ledger.json)。R1问题由正式R2在原范围CLOSED，作者本次不代替R3独立结论。CI/IndependentReview/Release NOT_EXECUTED_BY_CODER；新artifact MZ/用户美术/既有延期NOT_EXECUTED，08–10未开始。
