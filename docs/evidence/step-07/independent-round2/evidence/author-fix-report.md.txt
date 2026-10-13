# 步骤07 R1整改 Coding 交付

2026-10-13，Asia/Shanghai。**READY_FOR_REVIEW / IMPLEMENTED_AND_SELF_TESTED_PENDING_ROUND2**。正式R1已使用1/5，结论REQUIRES_REVISION；下一次正式第2/5轮。作者没有独立关闭问题、IndependentPASS、Approve、Merge、Push、Main canonical写入或开始08–10。

| 绑定                     | 精确值                                                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| 最新完整source candidate | `d343171ca866a8d1d1c4e272823ef475229d8032`                                                                                        |
| 前source / 前docsHEAD    | `4f6a40f3e8be990b4068dafee488249be737f7ad` / `82a356879cf490283572afc9fb49f8734cf5eb90`；原提交、构建、报告、ledger及失败全部保留 |
| docsHEAD                 | 随后的纯文档证据提交，精确值在最终回复及私有coding-progress；不伪造自身SHA                                                        |
| 本地分支                 | `codex/step-07-studio`                                                                                                            |
| 工程Build                | `step07-d343171ca866-68f0009e659aa6dc`，206 payload                                                                               |
| 工程Manifest SHA256      | `073bd135d8cbfc9c30355ad68facfa56361e4114564c07252c73bf87b1b69d04`                                                                |
| Profile内容hash          | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`，内容未改                                                      |
| 生产browser首个DB Build  | `89fe5029cdda2782e538f15a85c3026f4c81d3a689e675e4e9e32b6dbc389862`                                                                |
| 生产browser最终current   | `33992e9d534bcb3a857bc786625928a304b4405044dc3d2171525cfed447714f`                                                                |
| 首个标准Export           | `step05-pack-d343171ca866-eb5a66c93c561bda`，既有八文件契约及ID前缀                                                               |
| Export Manifest SHA256   | `eff0c05dab887b5b12b512d64a70cfb6148a70ab787980ecfd5f78e4119ef969`                                                                |
| 标准ZIP SHA256           | `5f3b78ca8390ddb571db64543af2b579ad605e9e33765024e77991c85d1817a0`；生产/开发逐字节一致                                           |

原R1报告SHA `96fd739b24d4bfac0e937f695eb5469591d570780d4b3fc7bd0ae3e824820686`。Main原件及308项证据只读验真，完整私有副本保留；[原报告文本、SHA与对应探针](../evidence/step-07/fix-round1/original-round1.json)可解析重算原报告SHA。原结论不改写。以下均为作者整改与自测，等待Main独立复审。

## STEP07-R1-001：P2 BLOCKING，已实施，待R2确认

共享存储新增内部PathBoundary，AssetStorage及backup/restore使用相同路径责任。每次实际文件/目录访问检查声明root、全部既存祖先与叶的真实类型，拒绝symlink，核对realpath属于实际root；实例保存已观察root及其上级目录的dev/ino，拒绝初始化后的同内容根替换和已绑定根消失。合法首次创建缺失目录仍支持。根检查不以当前文件SHA替代，也不限于initialize或叶文件。

读取使用O_NOFOLLOW及实际FileHandle，核对fd与已检查叶的dev/ino，读前后重查路径身份，再返回独立字节并保持长度/SHA校验。内部Build、Source、Export PNG/JSON、ZIP/replay均经共享边界。写stage/open/link/rename/目录sync与inventory同样检查；源失败清理仅对当前路径仍安全且dev/ino相同的本次自有stage，边界异常时保留现场。备份hash/copy使用已检查描述符流式读取，目标独占创建；输入/输出root、目录、manifest和PG工具前后检查，取消及父gate租约责任保留。

责任仍是合作式不可变文件协议：应用不在操作中重定向这些目录；检查和描述符捕获可观察的移换，Node路径API没有openat目录链。**不承诺抵御恶意本机管理员的ABA替换或所有系统调用间隙**，不声称反例证明任意秘密泄露，也不声称HTTP能创建链接。静态祖先链接与本次受控可观察竞态必须拒绝，不能借此免除硬边界。

在本实例旧4f生产dist上，合法id的source/A1/Manifest/ZIP/preview/processed六入口沿objects链接仍200；同内容根外拷贝与原SHA一致。保留[旧复现](../evidence/step-07/fix-round1/pre-freeze/r1-old-dist-http-observations.json)及原失败日志。冻结新候选上，objects/root链接的上述六入口全部422，builds链接的ZIP/preview也422；source/A1叶链接422，普通文件200，恢复原目录后source/A1及旧ZIP内容不变，并真实重建成功。[新公共入口控制](../evidence/step-07/fix-round1/http-and-recovery/r1-public-storage-boundaries.json)。

新增15项存储测试进入既有pnpm check：owner上级/root/objects/builds/stage/Build目录与两种叶链接、同内容plain root替换/根消失、fd打开后读祖先替换、验证后object发布重定向、source stage打开后祖先重定向、Build验证后目标重定向、相邻安全读取、hash/长度/path控制、backup根/嵌套目录/manifest叶检查。存储unit的普通字节与inventory-only备份fixture仅验证文件边界，未冒充领域Owned、PNG、PG dump或有效MZ Build。

真实PG/backup还验证：链接restore目标父目录拒绝，根外目录无写入，新空public schema无登记；正常新空DB/root恢复、实际再建、current/history/retired和标准Export继续可读。[拒绝恢复](../evidence/step-07/fix-round1/http-and-recovery/r1-rejected-restore-parent.json)、[完整恢复](../evidence/step-07/fix-round1/http-and-recovery/integrated-restoration.json)。

## STEP07-R1-002：P3 NON_BLOCKING，已实施，待R2确认

App只使用`loadedData.projectId === id`的数据；preview/旧06转换要求选定Build属于该data，processed图片要求选定recipe属于该data。加载新项目时隐藏旧资源/画布并显示中文加载状态；数据到达后再请求同项目产物。未新增交互架构、视觉打磨或修改后端白名单。

旧4f生产UI真实普通切换捕获错配GET404/422，原网络/trace保留。本次两模式实际browser各执行旧四文件Build合法POST转换、人工Studio构建、三次反向切换；刻意延迟新项目Studio响应时验证旧图片/Canvas不渲染，逐条比对URL的project与Build/recipe成员身份。生产74、开发94条响应无400+，无pageerror，两个current及旧内部Manifest不变。[生产](../evidence/step-07/fix-round1/browser-production/r1-project-switch.json)、[开发](../evidence/step-07/fix-round1/browser-dev/r1-project-switch.json)、[加载截图](../evidence/step-07/fix-round1/browser-production/r1-project-switch-0-loading.png)、[稳定截图](../evidence/step-07/fix-round1/browser-production/r1-project-switch-stable.png)。本项保留原非阻断P3分级。

## 冻结候选验证与范围

生产变化仅storage.ts、内部paths.ts、backup.ts、App.tsx；正式测试仅storage.test.ts、既有Studio HTTP integration、既有Studio e2e。完整7路径在[保护记录](../evidence/step-07/fix-round1/preservation.json)，1,881历史受保护文件不变；全部189非文档源码逐文件SHA在[source ledger](../evidence/step-07/fix-round1/source-files.json)。未改contracts/schema/migrations/锁/包依赖/全局配置/Profile/原型/母版/Compiler/Pack布局、槽位、动画、通行或plans；Web仍contracts-only，生产Node走dist/包exports。

源码提交后干净候选执行下表，随后只写文档。[实际命令/退出码/耗时](../evidence/step-07/fix-round1/results/commands.json)、[工程SHA](../evidence/step-07/fix-round1/results/engineering-verification.json)、[原文件与脱敏副本SHA](../evidence/step-07/fix-round1/original-file-provenance.json)、[全部证据ledger](../evidence/step-07/fix-round1/ledger.json)。新增case沿既有check/test:step07/test:e2e进入CI，无未来风险代替实际测试。

| 实际命令/动作                                     | 最新候选结果                                                                                                                                                                                               |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                      | 25文件253/253，含15新增存储；方向、strict/lint/format、clean build、11生产ESM exports                                                                                                                      |
| `pnpm db:migrate`                                 | 五项迁移，无pending；既有数据无reset，schema未改                                                                                                                                                           |
| `STEP07_TEST_API_PORT=4376 pnpm test:step07`      | 8/8；原7 case保留，新增公共路径控制及真实restore父链接；container/metadata/pixel/density/超量、read/codec timeout、cancel/concurrency/partial清理、CAS/COMMIT/late/retired/restore全部通过，211.06s含build |
| `pnpm test:step06`，独立新空regression DB/root    | 4文件23/23，193.86s含build；原60000ms单项预算未改，父lease/失锁/事务fence/任务重启/未知/归档/backup/restore通过                                                                                            |
| `INTEGRATION_API_PORT=4376 pnpm test:integration` | 3/3                                                                                                                                                                                                        |
| `pnpm test:dev-privacy`                           | 5/5真实Vite；公开根不扩大                                                                                                                                                                                  |
| `API_PORT=4376 WEB_PORT=5276 pnpm test:e2e`       | 生产3/3，123.96s；完整Studio、独立实际canvas像素、时钟、资源切换、失败保留成功、旧history ZIP、retired及P3切换                                                                                             |
| 同端口 `E2E_MODE=dev pnpm test:e2e`               | 开发3/3，143.19s，同Export/Manifest/ZIP SHA                                                                                                                                                                |
| `pnpm build:step07`                               | 206 payload重读SHA一致；固定出版目录未覆盖                                                                                                                                                                 |
| `pnpm build:pack-sample` / 已批准旧56 payload比较 | 8包/16PNG，56 SHA全部与批准05相同；source context包装身份变化如实记录                                                                                                                                      |
| 原公开JS probe / 8套pinned-core `verify-step05`   | 78/78、8/8原生CPU oracle；非新MZ GUI/游戏/美术PASS                                                                                                                                                         |
| 干净恢复实例真正API/browser                       | rebuilt current、源/配方/history读回，旧ZIP SHA不变，无pageerror，辅助API75160已关闭                                                                                                                       |
| 专属生产部署入口                                  | 真浏览器访问4376、选定最新current并实际Canvas；API84834保留供Main技术验收                                                                                                                                  |

创作PNG与独立nearest参考、交付isolated/edges四状态共8组实际Canvas与独立手写scene/quarter/原创母版逐像素相同，并作pinned-core矩形对照；holes/channel/pond/large及source/state/播放暂停step保留。具体[生产browser证据](../evidence/step-07/fix-round1/browser-production/evidence.json)、[实际Canvas](../evidence/step-07/fix-round1/browser-production/actual-canvas-edges-2.png)、[失败保留成功](../evidence/step-07/fix-round1/browser-production/05-failed-build-keeps-success.png)、[恢复实例](../evidence/step-07/fix-round1/restored-browser/evidence.json)。作者已用view_image看关键新截图，[查看收据](../evidence/step-07/fix-round1/results/screenshots-viewed.json)；不等于用户亲自美术通过。

## 资源、保留失败与未执行

仅本工作树PG55476/API4376/Web5276/.env/.local；PG PID51121及全部既有/新测试、regression、restore DB、资产、dump、stage/orphan与失败日志保留。当前生产API PID84834，`.local/assets`，入口`http://127.0.0.1:4376`，编译源码d343；Web5276无listener，恢复辅助API已关闭。[部署记录](../evidence/step-07/fix-round1/results/retained-runtime.json)、[入口截图](../evidence/step-07/fix-round1/retained-runtime.png)、[PG归属](../evidence/step-07/fix-round1/results/regression06-ownership.json)。没有复用Reviewer55477/env/root、init/reset、关闭未知进程或自动继续开发承诺。

原PNG政策及HTTP预算未放宽：single RGBA8 sRGB、4MiB、≤768×576、5s codec、既有metadata/density；JSON8KiB与binary独立budget、Host/Origin/client保护、有界槽/deadline/child close/cancel均保持。当前真实入口最大解码平面1,770,381编码bytes→1,769,472 RGBA bytes，因Studio96×144要求拒绝；RSS105,512,960 bytes、75.749917ms。[测量](../evidence/step-07/fix-round1/http-and-recovery/largest-http-decoded-plane.json)。JS heap128MiB仍不是OS/native RSS硬上限。

本次预冻结失败全部保留：[原始来源索引](../evidence/step-07/fix-round1/original-file-provenance.json)及[执行说明](../evidence/step-07/fix-round1/pre-freeze/execution-notes.json)。Stats overload类型标注、测试project accessor修正；旧UI基线probe的readiness取到过渡selection，改为等待已知legacy Build；首次HTTP整改probe错误要求坏根期间Studio读取成功，改为直接核对真实DB成功指针不变。另保留首次zsh只读变量status的wrapper差错。原日志/网络/trace、R1反例、此前82ba/4f及全部旧失败未删除，无删case/降阈/重置母版。

同一CID固定step_coder/gpt-6.1-sol/xhigh/default/Standard；服务端最终字段UNVERIFIED_NOT_EXPOSED，第1次正常恢复事实保留，无重置Review轮次、collaboration、加速或角色/全局配置变更。作者未识别剩余P0/P1/阻断P2实现问题，但P2/P3仍待Main正式R2独立确认。IndependentReview/CI/Release为NOT_EXECUTED_BY_CODER；新artifact MZ GUI/游戏、用户美术、Original Native Host及旧Map003延期仍NOT_EXECUTED。真实模型/SDK/Key/Prompt体系/Redis/SaaS及08–10未执行。此处停止等待Main。
