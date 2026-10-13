# 步骤07正式独立审查 — 第2轮 / 5

2026-10-13，Asia/Shanghai。结论：**REQUIRES_REVISION**。P0：0；P1：0；阻断P2：2；新增P3：0。R1的原路径逃逸与混合项目身份问题在其原范围内已独立关闭，但两个新的实际浏览器流程缺陷阻止技术放行。完整正式套件通过不替代这些独立失败。

本报告是技术Review，不是Main批准/发布、用户逐图美术确认或新产物MZ实测。未修改生产源码、正式tests、Main/Coding目录或canonical状态；未commit/merge/push、自行批准或启动08–10。正式轮次保持2/5，R1已用1/5且REQUIRES_REVISION，不重置。

## 冻结身份与独立性

| 对象                         | 精确绑定                                                                  |
| ---------------------------- | ------------------------------------------------------------------------- |
| 功能候选 / checkout HEAD     | `d343171ca866a8d1d1c4e272823ef475229d8032`                                |
| 作者docsHEAD                 | `1a3881edd3a076649f86794b05ac47f4c4c7a315`                                |
| 作者整改报告SHA256           | `533bdf886561591df8e4ba8e54e6ee636e504308b7e46e08ca5546078af2a431`        |
| 工程Build                    | `step07-d343171ca866-68f0009e659aa6dc`，206文件                           |
| 工程Manifest SHA256          | `073bd135d8cbfc9c30355ad68facfa56361e4114564c07252c73bf87b1b69d04`        |
| Profile内容身份              | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`        |
| 独立六源浏览器首个DB Build   | `c93d72c08e23cecd1b512804030f24f59d9f938905ea768aa63e7a5cf703965c`        |
| 同一标准Export BuildIdentity | `step05-pack-d343171ca866-6641f0d5e7e26a3c`                               |
| 同一Export Manifest SHA256   | `1c829f7ba542fa1df6f2c068026448ed2c5136babf4a243e598095fbfff85733`        |
| 同一标准ZIP SHA256           | `76ba10dfb2cfd2b9760d2834c41e3dc974f39917f46514b1b8e9d2bdd8816c45`        |
| 首个A1 PNG SHA256 / bytes    | `c97ad74df1a85796133c950281873431f09876d78a7a4dd89c5f5f1958f22c91` / 3924 |
| 首个A2 PNG SHA256 / bytes    | `ce800dd337e00e1dc37caf86b7e03eabf7673666b25b47806d5405be1247b2e0` / 2457 |
| 审查根                       | `/Users/dingshinn/.codex/worktrees/step-07-review-round2/rpg-maker-maker` |

客户端收据核对`step_reviewer / gpt-6.1-sol / ultra / default`、cwd与round2；native thread为`01a13433-4b34-7af1-b498-e4c984715e27`。见[配置](evidence/client-configuration.json)。不可见服务端最终model/effort/tier明确为 **UNVERIFIED_NOT_EXPOSED**。没有collaboration调度、Priority/Fast/Ultrafast、模型覆盖或全局配置修改。

全部2,084个tracked文件前后SHA相同，覆盖源码、正式tests、fixtures、Profile、plans、配置、锁、历史证据和checkout旧state；HEAD始终精确d343，Git clean。[开始](evidence/tracked-before.json)、[结束](evidence/tracked-after.json)。作者docs通过git show读取，source→docs共153路径均为README/docs/证据，没有执行影响资料夹带。fresh生产206文件、独立工程BuildIdentity和Manifest SHA匹配，开发构建后再次匹配。[工程验真](evidence/engineering-verification.json)。未在根artifacts出版或覆盖旧工程产物。

完整阅读AGENTS、两份正式plans、MZ_RUNTIME_ENVIRONMENT、STEP03–07当前契约、最新需求映射、06–07 authorization、两份07 Coding报告、失败/ledger、06最后R3 PASS及发布记录。Main canonical仅只读；checkout旧state作为历史快照。按07及相关跨模块实质差异审查，没有重开05全Review/MZ手工。

作者初次140、整改148项ledger逐项git show/SHA核对，160个作者私有原文件只读SHA核对；作者结果仍单列，不算本轮PASS。[作者初次](evidence/coding-author-ledger-audit.json)、[整改](evidence/fix-round1-author-ledger-audit.json)、[原始保留](evidence/author-original-audit.json)。235PASS/1FAIL原日志仍在，失败是新增OpenAPI routes与旧三路径inventory断言不匹配；原日志不删除，最新精确route断言合理扩展，没有降低PNG/像素/时限预算或重置母版。

R1 Main原报告SHA精确`96fd739b24d4bfac0e937f695eb5469591d570780d4b3fc7bd0ae3e824820686`，308项payload核对。[R1审计](evidence/round1-ledger-audit.json)。部分独立R1探针沿用，来源SHA与本轮路径/端口适配记录在[探针来源](evidence/prior-probe-provenance.json)；本轮另写存储、公共路径、恢复边界、普通切换和慢轮询探针。全部数据/执行新建，没有复用R1/Coding的.env、PG或资产。

## OPEN：STEP07-R2-001 — P2，BLOCKING，轮询互相作废导致完成状态无法进入界面

- **冻结位置：** `apps/web/src/App.tsx:54–57`、`:86–92`。每次refresh立即递增generation；800ms setInterval不等待上一次请求，返回时只接受最新generation。
- **规格：** 产品§4.4、§7与计划步骤07的真实任务状态/恢复原因、当前成功与历史、非开发用户构建后查看结果；STEP07真实StudioJob工作流。责任为Web轮询/请求状态协调。
- **触发：** 真恢复DB/API实例，普通UI选项目并等待画布、processed PNG都成功，再点击构建。仅把该项目`GET /studio`响应延迟1300ms；不修改响应JSON、任务、数据库或产物，POST/构建继续使用真实入口。延迟小于现有正常请求预算，属于受控合法慢响应。
- **实际：** 任务`8d6cfeda-ee97-41a4-ab14-a5e4dc8a8fc3`已真实COMPLETED并发布`5b52901d8e18e558d5bc5350f3e926c0c018f4ce749c72077d52d874a557b264`，期间送达6个含COMPLETED的真实响应，UI仍显示“正在构建 · 8d6cfeda”，构建/组件按钮禁用，新的实际构建不能通过该任务行选择。旧成功被继续标成current。每个慢响应都被之后启动的轮询作废；移除延迟后正常响应立即使UI显示完成。这不是DB提交失败或旧任务覆盖新current。
- **预期：** 合法慢响应下仍最终展示真实终态和成功/历史身份；项目变化或迟到旧选择不能回滚界面。轮询不能因正常响应时间超过800ms而永久饥饿。
- **证据：** [原始请求/真实终态/6个完成payload/快响应控制](evidence/poll-latency/evidence.json)、[延迟窗口收据](evidence/poll-latency/delayed-observation.json)、[已实际查看截图](evidence/poll-latency/delayed-completed-backend.png)、[独立探针](evidence/probes/poll-latency.mjs.txt)。探针exit0表示反例被捕获，不能记作候选PASS；private trace保留。
- **最小整改：** 串行轮询或等本次请求结束再安排下一次，保留项目/选择generation与旧响应防护。增加大于800ms合法慢成功/失败响应、正常快响应和切项目/旧任务迟到控制；不提高时限或去掉身份守卫。

## OPEN：STEP07-R2-002 — P2，BLOCKING，普通项目切换使合法处理预览被旧工作挤掉

- **冻结位置：** `apps/web/src/App.tsx:93–109`仅取消descriptor/转换；`:394–397`直接img读取processed，没有对应取消、BUSY恢复或重读。对应预算`apps/api/src/studio-service.ts:117–142`为一个处理槽加一个等待槽，预算本身应保留。
- **规格：** 产品§4.4/§11.3及步骤07必需的源/遮罩/处理素材创作预览、合法普通读取、旧预览取消和有界资源政策。责任为Web重处理读取的生命周期/协调；不是要求扩队列或提高native并发。
- **触发：** 恢复实例两个真实项目：已转换旧06项目与人工Studio项目。新浏览器选旧项目，交付画布就绪后正常点击人工项目；此时旧processed图片尚在处理。没有网络延迟/故障注入、内部JSON/DB/路径编辑；三次新context普通操作独立复现。
- **实际：** 三次旧processed naturalWidth均为0（尚在加载），新项目合法`/recipes/9ad3ca0fecb986bc4d58290eee75797845288cb9a82d3e02360cf1d3d4610dda/processed?frame=0`均返回429 BUSY，新processed naturalWidth在交付画布就绪后再等2500ms仍为0并显示坏图。旧processed请求随后200完成，新的descriptor/PNG/Manifest/Profile及download身份正确，但img无自动重读，也未将BUSY诊断呈现给用户。后端current/history和文件未损坏；这是新合法资源的可用性缺陷，不是R1混合项目ID反例。
- **预期：** 旧创作预览读取被取消/协调，当前合法创作与交付预览在固定预算内完成；必要的BUSY诊断及有界恢复可用，不留下不可用图片。
- **证据：** [三次纯UI普通切换/完整网络](evidence/switch-resource-race/evidence.json)、[已实际查看坏图与有效current](evidence/switch-resource-race/ordinary-switch-0.png)、[独立探针](evidence/probes/switch-resource-race.mjs.txt)。最初带Studio数据延迟的[整合失败](evidence/browser-followup/evidence.json)同样捕获429并保留，后来三次无注入验证排除了该延迟条件。
- **最小整改：** 将processed读取纳入按project/recipe/frame绑定的可取消请求生命周期，并协调当前重处理读取，或提供有界BUSY恢复/显式重读。保留1 native槽、1等待槽、child close后释放与身份守卫；回归普通快切、延迟项目数据、播放源帧、历史下载和取消后紧接下载。

当前正式e2e未覆盖“交付已就绪但旧processed尚未结束就切换”的窗口：它在后续切换前等待processed成功；旧06首次转换的排队顺序也能避开该窗口。正式三项全部通过不证明上述普通操作安全。纯界面美术打磨仍归步骤10，没有新增风格P3整改循环。

## R1问题结论

**STEP07-R1-001 — CLOSED / FIXED_INDEPENDENTLY_VERIFIED（原阻断P2）。** `packages/persistence/src/paths.ts:33–118`及storage/backup调用共同检查root/既存祖先/叶、root dev/ino、realpath、O_NOFOLLOW和fd身份，读后复核且保持bytes/SHA。源、A1、Manifest、Profile、ZIP、preview、processed真实公共入口验证objects/builds/root、source/A1叶、标准Build目录链接、同内容plain root replacement及消失；相关访问拒绝，恢复原inode后正常文件200/原ZIP字节不变，DB current/history不变且实际重建成功。[公共八类控制](evidence/public-storage.json)。

另写10组byte/file控制，覆盖上级owner、root、目录、叶、stage、同内容根替换/消失以及打开fd后可观察的祖先变换；拒绝后合法读取恢复。[独立存储](evidence/storage-extra.json)。真实PG备份的输入root/parent/assets/manifest/dump边界拒绝，合法备份继续验真；restore输出父链接拒绝后根外文件0、全新public表0。[真实备份边界](evidence/restore-boundaries.json)。正式新增15项存储及HTTP恢复边界同时通过。

结果按实际访问链判断：builds分支被链接时，仍安全的objects PNG读取可以200，而通过builds的preview/ZIP拒绝；单独原source叶链接时，source/processed拒绝，已自包含真实源字节的合法标准Export仍可读。没有把不相关安全链全部拒绝当目标。原source-leaf探针误要求ZIP也422的失败、原代码与fixture保持，修正的是探针访问链假设，非生产/正式测试。

上述仅证明明确禁止的同SHA合作式根外读取被拒绝和可观察移换被检测；不声称任意秘密泄露、HTTP植链、恶意管理员ABA或全部系统调用竞态防御。Node缺少openat目录链的局限未作为静态祖先拒绝的豁免。

**STEP07-R1-002 — CLOSED / FIXED_INDEPENDENTLY_VERIFIED（原非阻断P3，原身份范围）。** `apps/web/src/App.tsx:45–48`、`:96`、`:379`要求data/project与Build/recipe成员一致。两模式正式浏览器均真正延迟新项目数据、转换旧06并三次反向切换；加载窗口无旧图片/画布，preview/processed/convert的项目和成员身份无错配，两个current与旧内部Manifest保持。[生产身份回归](evidence/formal-production/r1-project-switch.json)、[开发](evidence/formal-dev/r1-project-switch.json)。后续普通切换的429是R2-002的独立资源协调问题，没有重开原404/422错配缺陷。

## 本轮环境、命令与失败保留

Node22.21.1、pnpm10.20.0、PostgreSQL14.20；每条执行child PATH显式固定`/Users/dingshinn/.nvm/versions/node/v22.21.1/bin`。先核对.env/cluster不存在、端口空闲，再用现有local-postgres脚本独占init PG55479；自身.env600，API4379/Web5279，资产`.local/step07-review/assets`。regression DB另新建并迁移；restore使用新空`tileset_review_restore_a329254432904e618031734cbdacf2cc`及原本不存在的`restored-assets`。无reset/他人.env/可写PG/资产复用；PG55477/55476未写。[环境](evidence/environment.json)、[回归归属](evidence/regression-environment.json)、[最后DB清单](evidence/tracked-after.json)。

正式HTTP/PG套件从自己的formal-workspace运行，源码/config/tests仅链接当前冻结文件，自己的.local承载输出。新e2e直接调用resolveAssetRoot并依赖repo cwd，故最终从repo cwd运行未改正式tests，输出完整移入review。固定目录及官方隐私canary均是本轮新生成的测试内容，不改生产源码/正式测试，原有会话成果不删除。[输出归属](evidence/output-ownership.json)。工程仅重建/hash，Pack样例从review内独立pack-workspace出版。

精确argv/cwd/退出码/耗时见[commands.jsonl](evidence/commands.jsonl)；凭据与原日志、dump、trace、阶段/orphan/失败现场留private，不入脱敏ledger。

| 命令/动作                                   | 本轮真实结果                                                                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| frozen install / db:generate / db:migrate   | exit0，固定锁；本实例空DB应用全部5迁移                                                                                                    |
| `pnpm check`                                | exit0，25文件253/253；方向、Strict、lint/format、clean build、11生产JS exports                                                            |
| 原step07 config/tests，formal cwd           | exit0，8/8，200.879s；真实HTTP/PG、输入/预算/超时/cancel/cleanup、CAS/COMMIT、旧06/restore及路径控制                                      |
| 原step06 config/tests，独立regression DB    | exit0，4文件23/23，194.543s；原60000ms单项预算不改，父租约/失锁/完整TX fence/故障/竞态/Mock重启/备份恢复                                  |
| `INTEGRATION_API_PORT=4379` API integration | exit0，3/3                                                                                                                                |
| 原Vite privacy tests                        | exit0，5/5，真实Vite；私有/.local/全repo/symlink表面保持受限                                                                              |
| 原e2e，生产/开发                            | exit0，各3/3，122.026s / 141.246s；完整人工Studio、像素、历史/retired、身份切换                                                           |
| fresh工程两次验真                           | exit0，206/206及BuildIdentity/Manifest SHA匹配                                                                                            |
| 原生产JS独立scalar probe                    | exit0，78/78；公开包exports                                                                                                               |
| 原build-pack-sample / 独立旧hash比较        | exit0，8套/16PNG，56payload与批准05完全相同；context/Manifest包装身份另记                                                                 |
| 独立六源UI browser / Python reference       | exit0；24场景状态、4创作源状态、2×nearest、不同实际Build像素、4份真ZIP、网络PNG/Manifest/Profile及完整图集一致                            |
| actual main入口 public-http                 | exit0；实际PG延期COMMIT整体rollback/恢复、同PNG不同ID、字段/URL/路径/Origin/client、1处理+1等待取消后紧接下载/GET只读/cross-project均通过 |
| public Host控制 / source-root控制           | exit0；Host/forwarded/Origin/fetch-site拒绝及正常200；八种路径控制、恢复和重建通过                                                        |
| 一致备份→干净DB/文件restore→Mock恢复        | exit0，114.841s；真旧06 writer四文件、源/配方/history、known同ID/unknown不重提/late不adopt                                                |
| 恢复实例实际browser                         | exit0；合法POST旧06转换、holes预览/ZIP、current/history读回及UI实际新建Build                                                              |
| 稳定项目实际clock＋独立reference            | exit0；29/30、59/60、89/90、119/120、239/240、359/360共12+12 source/delivery像素样本，三周期一致                                          |
| 实际已接受Job后SIGKILL/重启                 | 仅自启API被kill；重启job FAILED/INTERRUPTED，last success canvas/ZIP原字节保持，5份恢复ZIP验真                                            |
| slow polling / ordinary switches            | **捕获R2两个阻断FAIL**；exit0为反例捕获，不作候选PASS                                                                                     |
| 最后源码/服务核对                           | exit0，2,084 tracked SHA未变；HEAD d343/git clean，API4379/Web5279无listener                                                              |

所有普通/CI测试只用人工与Mock，没有真实视觉模型、SDK、key或收费调用。计数不相加成覆盖率。

自身执行差错/中断均保留：[说明](evidence/execution-notes.json)。R1脚本放置层级导致import失败、byte探针Buffer/Uint8Array expected类型差异、source-leaf访问链预期错误只修自己探针。第一次隔离cwd浏览器由本人只SIGINT其own CLI，exit130、trace/日志保留，未作PASS；随后正确repo cwd两模式完整通过。初次poll在重处理尚忙时点击构建得到合法429；第二次route teardown的工具异常保留，最终受控探针有完整慢/快控制与可复核失败。组合project-clock真正因processed429失败保留；另一个稳定项目clock完成必要像素验证，没有将原失败改为green。formal源码、预算、母版均未修改。

## 真预览/标准下载与06–07整合

独立浏览器通过创建→刷新DB持久化→失败PNG中文诊断→逐一上传六个真实PNG→精确revision/基线风格→采用固定草地/三水帧/mask/overlay配方→真实任务/Build→组件替换新revision及水草受影响重建→history/retired/容量失败及最后成功保护。普通路径只使用UI，没有编辑内部JSON、DB、路径或最终图集，也未点击人工美术确认。P2失败的条件/有效控制独立列出，不把常规成功路径当无条件完整可用。

四份初始/更新/history/失败后ZIP真实解压、CRC、精确八个安全文件名（无重复/额外）、各文件bytes/SHA、canonical BuildIdentity、Manifest/TargetProfile引用全部核对。浏览器实际A1/A2/Manifest/Profile网络字节与同一ZIP一致；Profile完整封装在Manifest，资源返回同内容，无第九文件。[浏览器操作/console/pageError/network/download](evidence/browser/evidence.json)、[独立像素和ZIP](evidence/browser-pixel-zip-verification.json)。

独立Python/Pillow用原PNG、二值mask/overlay、手写邻接quarter坐标与occupancy重建孤立格、边角、孔洞、窄通道、池塘、大片共24状态；不调用生产Compiler/descriptor/scene renderer生成expected，不用旧CPU截图。首个完整768×576两图集包括透明保留区亦一致。真实换Build改变A1网络身份与实际canvas像素，旧ZIP原字节保持；迟到旧descriptor不能回退选择。源动画4状态、2×nearest和12+12实际clock边界样本逐像素一致。[clock](evidence/clock-canvas-verification.json)、[实际采样](evidence/clock-browser/evidence.json)。RAF只调度；fixed60 logical updates/秒，30次/状态，0→1→2→1；播放、暂停、恢复、step及hidden冻结/恢复锚点已实际浏览器控制。hidden用document.hidden/visibilitychange受控执行，不冒充OS后台窗口或MZ游戏实测。

已用view_image实际查看六源/mask/overlay、原动画、边角/孔洞/窄通道/池塘、update60画布、失败保留成功、加载隐藏、旧06转换、中断原因及两个R2失败截图。[逐图SHA/查看收据](evidence/screenshots-viewed.json)。技术查看与像素验证不写USER_CONFIRMED。

旧06 fixture使用git show已发布c227的6个真实Persistence模块在本review.local转译执行，依赖当前未改变的像素/Compiler/Pack语义，产生实际四文件Build并保存内部Manifest SHA；不是修改JSON字符串伪造旧包。这是隔离旧writer恢复fixture，不冒充全套c227 clean工程重新发布。新一致backup→全新空DB/root restore后Studio实际读取六源/recipe/current/完整history；已提交/未知Mock保持原记录，known原ID完成、unknown仍SUBMISSION_UNKNOWN、remote IDs不增、late不adopt。[整合](evidence/integrated-recovery.json)。

旧06转换前GET preview/download409且DB counts/current/Build/Pack/Slot不写；坏Origin/缺client POST403；UI真正受保护POST追加标准Export后真实holes/ZIP有效，旧内部Manifest、current与历史身份不变。actual restored browser又执行新Build，history ZIP与首个原字节相同。[恢复浏览器](evidence/restored-browser/evidence.json)、[5份真恢复ZIP](evidence/restored-zip-verification.json)。四文件durable bundle从未称作标准八文件Pack。

最后另真SIGKILL自己的API60999（已核对command）在新Job接受后50ms中断；恢复FAILED/INTERRUPTED，不重当新任务，成功`5b52901d8e18e558d5bc5350f3e926c0c018f4ce749c72077d52d874a557b264`及其ZIP保持。[中断前](evidence/interruption-before.json)、[中断后](evidence/interruption-after.json)。晚返回/反向完成、父链/事务fence、并发同槽、退休依赖及失锁备份的23项06真实回归通过。两个R2问题属于UI读取/终态表现，不推断DB或标准包损坏。

跨模块已检查新schema/迁移、HTTP contracts/exports、pack-export提取、image-adapter abort/child close、Compiler只读rectangle/shape descriptor、持久化FinalExport与StudioJob同事务、共享paths/storage/backup和Web成员守卫。Web仍contracts-only；生产只用构建JS/声明exports；Profile/plans/母版/原型/Compiler算法/布局/槽位/动画/通行语义未改变。56旧payload/16PNG与受影响03–05完整check支持该范围，无未审实质改动夹带或继承旧截图为新MZ证据。

HTTP入口保持single RGBA8/sRGB、4MiB、≤768×576平面、Studio96×144、density1/2、container/CRC/metadata/像素限制，JSON8KiB、请求/队列/响应预算与5s codec未放宽。实际最大平面1,770,381编码bytes→1,769,472 RGBA，因Studio尺寸拒绝，child RSS108,199,936 bytes / 75.112167ms；JS heap128MiB不是OS/native RSS硬上限。[本轮测量](evidence/formal-http/largest-http-decoded-plane.json)。慢读、超量、codec deadline、断连、取消/slot复用、失败仅清自有stage及不可变orphan保持；合法取消后下载通过不能消除R2-002的未管理img路径。

QA源/IR/Compiler/Pack/文件硬验证后端生效，结构失败不交付；接缝、重复/单调、颜色/亮度突变、闪烁和低动画是带阈值与局限的risk，不单一总分/纯色无缝冒充美术质量。STRUCTURAL_PASS、人工视觉、已有Profile阶段基线与具体ARTIFACT_MZ_TESTED分别展示，全部本次产物MZ/用户美术仍NOT_EXECUTED。

## 未执行、结束与门禁

新MZ GUI/编辑器手绘/游戏、Original Native Host、旧Map003补证、用户亲自逐图美术、RPGReactor、8套pinned-core CPU oracle、远端CI、真实视觉模型/SDK/key/Prompt体系为 **NOT_EXECUTED**。旧05阶段验收与06 R3发布事实仅在原范围引用；外围变化不机械重开05手工，也不把曾实测Profile升级成每个新Build已实机通过。08/09/10未启动。

本轮API/Web均关闭，只关闭/kill自启实例；PG55479与自己的DB、资产、backup/dump、stage/orphan、失败trace/原日志留私有.local，由Main核对ownedPG后关停。没有关闭未知PG/API或删除其他会话成果。当前canonical由Main管理，本报告不写其状态。

报告仅对自身文件用项目Prettier `--ignore-path /dev/null --write`后hash；报告与脱敏逐文件SHA见[evidence/ledger.json](evidence/ledger.json)，相对根明确为`.local/step07-review`；进度在`progress.json`。P0/P1/阻断P2清零并由最新候选独立复核必要失败前，**不能PASS**。将来技术PASS仅是既有委托的浏览器技术验收，不是用户逐图艺术/MZ亲自确认。本轮停止。
