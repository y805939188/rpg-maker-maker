# 步骤07 Coding 交付

2026-10-13，Asia/Shanghai。**READY_FOR_REVIEW**。作者仅 Coding、自测及本地冻结；Main 独立 Review、候选CI、批准和发布未由作者执行。步骤08–10未启动，无真实视觉模型/SDK/Key/PromptRegistry/Composer/model routing/收费/Redis/SaaS。

| 绑定                     | 精确值                                                                                                                                                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 最新完整source candidate | `4f6a40f3e8be990b4068dafee488249be737f7ad`                                                                                                                                                                                              |
| 功能实施提交             | `82ba643387f9a119bbfc9867bd196c36b481da3f`；最新提交仅修正工程构建说明与07协议身份                                                                                                                                                      |
| 分支 / 起点              | `codex/step-07-studio` / 已发布06后docs交接 `b9dd129fac2c65bb01ad1da09800c6a391c01ee5`                                                                                                                                                  |
| docsHEAD                 | 随后的纯文档/证据提交；精确值在最终回复与私有coding-progress，不在自身内容中伪造自引用SHA                                                                                                                                               |
| 工程Build                | `step07-4f6a40f3e8be-1c608f824716442d`；203 payload                                                                                                                                                                                     |
| 工程Manifest SHA256      | `72219bf929f1a1ed8315b90670cca1ab502ae9a9bb18617e56fccdcefb4b9ec0`                                                                                                                                                                      |
| Profile内容身份          | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`                                                                                                                                                                      |
| 浏览器标准Export         | `step05-pack-4f6a40f3e8be-d0c88bbea12cf2f4`（标准契约保留原ID前缀）                                                                                                                                                                     |
| Export Manifest SHA256   | `fea7ceb7a41ad1f2e1b7cf3f7c4e90923943298e6bc45b26ae9bad187dd9dc36`                                                                                                                                                                      |
| 标准ZIP SHA256           | `94e5332f05784816d5a02adff22ce850911d29fecf40aafd8d85de9d62463eda`                                                                                                                                                                      |
| 生产浏览器DB Build       | first `a669432559930b3aeded6a6a8a71ff645e5edb16abbcd4f6060ec17210a2dca2`；second `58e23a9e0c6bf342ef6bf75a0b2fd9da2408dfa43b7a3f53fcc472c7b79b3924`；retired/current `ca19d2506e7bdd440151319b9925bb95a5907f112c65fa770901ab0d540a9553` |

源码冻结后始终在干净精确candidate上执行以下检查；其后仅写文档。完整 [命令/退出码/耗时](../evidence/step-07/coding/results/commands.jsonl)、[工程SHA验真](../evidence/step-07/coding/results/engineering-verification.json)、[ledger](../evidence/step-07/coding/ledger.json)、[基线](../engineering/STEP_07_BASELINE.md)可重读。

## 实施与边界

可操作中文Studio具备项目创建/选择/刷新、真实PNG上传/诊断、原创/编号样例、六组件精确revision和风格选择、固定配方采用、本地任务与实际Build、替换组件/受影响配套重建、current/history/RETIRED及标准包下载。用户不手改DB、JSON、最终排列或内部路径，不需key/model。

Web仍仅contracts；contracts唯一HTTP DTO/Zod/OpenAPI。API复用Persistence/AssetStorage/WriteGate/resolveAssetRoot/public restore。共享pack-export提取既有标准导出实现，保留CLI签名与八文件契约。新增成员先登记方向、build、clean、工程收集与生产exports。SourceAssetBytes/Pixel各自拥有，公开恢复实际解码/构造/处理/Compiler，不断言JSON为拥有对象。

内部durable四文件与标准八文件独立。标准Manifest嵌入完整具体TargetProfile，profile资源返回相同内容；预览和ZIP来自同一选定真实Export。源、IR、Compiler、完整历史/布局、PNG像素、文件/hash/Manifest/context全量重读。旧06构建通过受保护POST追加标准导出，GET只读且不改旧Manifest/current。成对更新保留逻辑ID、各自revision和稳定slots；退役依赖保留，旧history可下载，容量明确失败。

StudioJob完成、Build/FinalExport登记和CAS指针同短事务；真实PG延期提交拒绝整体回滚。提交已完成而回执失败读回真实COMPLETED，不误标失败。晚到旧快照仅历史，失败不替换上一成功。源写open/partial失败仅清本次自有且dev/ino相同的stage；完整immutable orphan与Build中断stage保留定位。

双Pixi预览读取实际保存资源。创作看原PNG/mask/组件/处理素材和源水面；交付看真实A1/A2+Manifest+Profile。Compiler只新增只读rectangle/邻接shape接口，quarter表、原编译、Profile、槽位、mask和动画语义均未改；Web不导入Compiler/复制生产表。nearest整数缩放、播放/暂停/逐状态与fixed60 logical updates/s，30次推进0→1→2→1；hidden冻结，不追赶，单次可见卡顿限250ms。

QA聚合硬校验与定位risk，明确接缝/重复/亮度、RGB色变/flicker/几乎不动的阈值及局限，不给美术总分。STRUCTURAL、risk、人工视觉、已有Profile阶段基线、具体ARTIFACT_MZ_TESTED分别呈现。作者/Reviewer技术截图不写用户美术PASS，本产物MZ仍NOT_EXECUTED。

## 最新候选验证

| 实际命令 / 动作                                        | 结果                                                                                                                                                                                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check`                                           | exit0；24文件238/238；13方向、strict/lint/format、clean生产build、11实际ESM exports                                                                                                                                                        |
| `pnpm db:migrate`                                      | exit0；五项迁移，无pending；独占新空集群后增量执行，无reset                                                                                                                                                                                |
| `pnpm test:step07`                                     | exit0；7/7真实HTTP/PG、156s测试；含format/metadata/pixels/density/超量、读/codec timeout、cancel/concurrency、source open/partial清理、standard Export/CAS、完整backup/clean restore/rebuild、同内容不同ID、旧06转换及真实PG延期COMMIT拒绝 |
| `pnpm test:step06`                                     | exit0；4文件23/23，原60000ms单项预算不改；本集群新空独立regression DB/root；父租约、失锁/事务fence、任务未知/重启/归档/迟到、备份/公开恢复完整回归                                                                                         |
| `INTEGRATION_API_PORT=4376 pnpm test:integration`      | exit0；3/3，真实DB→Nest/HTTP                                                                                                                                                                                                               |
| `pnpm test:dev-privacy`                                | exit0；真实Vite私有路径/Origin/包装/符号链接防护保持                                                                                                                                                                                       |
| `API_PORT=4376 WEB_PORT=5276 pnpm test:e2e`            | exit0；2/2生产实际浏览器完整人工workflow                                                                                                                                                                                                   |
| 同端口 `E2E_MODE=dev pnpm test:e2e`                    | exit0；2/2开发实际浏览器，同标准Export/Manifest/ZIP逐字节一致                                                                                                                                                                              |
| 恢复DB/root部署后 `restore-browser.mjs`                | exit0；真正恢复实例current是实际重建Build；源/配方/历史读回，旧history预览和ZIP SHA不变                                                                                                                                                    |
| `pnpm build:step07`                                    | exit0；203 payload与Manifest重算SHA一致，正确07 Studio契约/说明                                                                                                                                                                            |
| `pnpm build:pack-sample` + 原批准56payload对照         | exit0；八标准包/16PNG，56 payload与批准步骤05全部SHA相同；仅包装context/Manifest因source commit不同                                                                                                                                        |
| 原公开JS scalar probe / 8次pinned-core `verify-step05` | exit0；78/78；八套原生CPU矩形/像素/更新对照通过，非新GUI/游戏/美术PASS                                                                                                                                                                     |

正式CI新增test:step07；原check、06、privacy、两模式browser保留。远端CI **NOT_EXECUTED_BY_CODER**，Main运行。计数不相加为独立覆盖率。

原命令runner实际统一设置 `INTEGRATION_API_PORT=4376`，但commands.jsonl的env摘要未列出该项；原日志和runner均保留，不改写原记录。绑定和原文件哈希核对见 [交接审计](../evidence/step-07/coding/handoff-audit.json)。

交接正文Prettier与限定正文的Git空白检查通过。包含日志证据的 `git diff --cached --check` 返回2，12处提示仅为原日志尾空格/终尾空行；记录保留在交接审计中，脱敏日志字节及原文件SHA不因此重写。这是文档证据格式提示，未作为功能测试或Review通过依据。

[生产browser证据](../evidence/step-07/coding/browser-production/evidence.json)及[开发browser证据](../evidence/step-07/coding/browser-dev/evidence.json)保存实际操作、console/pageerror/network与download SHA。覆盖create/refresh、upload成功/真实诊断、recipe/build/download、换ActualBuild后资源及渲染切换、history旧ZIP不变、retired、失败保留成功、播放暂停step。创作Pixi实际PNG与独立nearest源参考一致；交付Canvas isolated/edges每四状态共八组与独立手写quarter/scene+原创母版逐像素相同，并与pinned unmodified native-core rectangles对照。holes/channel/pond/large关键截图保存，作者已查看。

关键查看：[创作原源Pixi](../evidence/step-07/coding/browser-production/01-creative-source-pixi.png)、[交付真实Canvas](../evidence/step-07/coding/browser-production/actual-canvas-edges-2.png)、[current与完整工作台](../evidence/step-07/coding/browser-production/06-current-reloaded.png)、[失败保留成功](../evidence/step-07/coding/browser-production/05-failed-build-keeps-success.png)、[retired](../evidence/step-07/coding/browser-production/05-retired.png)、[恢复实例](../evidence/step-07/coding/restored-browser/evidence.json)。这些是技术证据，未点击用户美术确认。

## 资源、环境和失败保留

仅原合格single RGBA8 sRGB PNG，4MiB/≤768×576/5s codec/原metadata政策不放宽；Studio源96×144/density1或2。JSON8KiB独立route预算，PNG5s read、4096chunks，Host/Origin/custom-header保护，读/响应/处理/有界等待槽、deadline/cancel/child close/slot release、白名单ID/path及stage清理均真实测试。Vite允许根未扩大。

真实HTTP最大解码平面测试：1,770,381编码bytes→768×576/1,769,472 RGBA bytes，因Studio源尺寸要求拒绝；child RSS106,676,224 bytes、codec73.024291ms。JS heap128MiB **不是OS/native RSS硬上限**；input/metadata/pixel/短child与实测是当前控制依据。[记录](../evidence/step-07/coding/http-and-recovery/largest-http-decoded-plane.json)。stalled worker仅测试factory注入，生产无HTTP/环境调试入口。

专属.env/.local/postgres，PG55476/API4376/Web5276，assets.local/assets、日志/独立恢复根.local/step07。Node22.21.1/pnpm10.20.0/PG14.20，PATH仅本进程固定；未复制他人.env、复用他人DB/root、reset valuable数据或更改全局MZ/NW.js/RPGReactor。仅关闭自启实例；正式部署后非开发用户只操作浏览器。恢复只新空tileset_ DB/不存在root，owner清单及私有dump保留.local，不上传。

交接时保留本工作树生产API PID59493、PG PID51121和全部资产/备份/测试及恢复DB；入口 `http://127.0.0.1:4376` 已由实际浏览器验证，见 [运行记录](../evidence/step-07/coding/retained-runtime.json) 与 [截图](../evidence/step-07/coding/retained-runtime.png)。恢复测试辅助API已关闭，Web5276无监听；此次恢复仅核对进程与端口，不重复功能测试，也不承诺客户端关闭后自动开发。

初始迁移先于build的拒绝、TS/路径/format接线错误、OpenAPI精确清单扩展、预览争槽、旧画布过渡时序、同内容不同逻辑ID碰撞与首次browser失败全部保留。[失败索引](../evidence/step-07/coding/failures/index.json)给原SHA与脱敏副本；未删失败case、降低阈值或重置母版。初次工程Manifest错误继承“无Studio”说明，另作单文件元数据修复并全量重绑最新4f6a40f；[旧Manifest与影响](../evidence/step-07/coding/superseded-82ba/impact.json)保留，不覆盖出版目录。

不可见服务端最终model/effort/tier为UNVERIFIED_NOT_EXPOSED；会话固定step_coder/gpt-6.1-sol/xhigh/default，无collaboration/加速/角色或全局配置改动。Main/Reviewer目录和canonicalstate未写；plans/Profile/golden/原型/旧报告保留。

本次为同一CID `01a132c0-f44b-75f0-bea5-7f4e5e77a6ea` 的第1次正常客户端恢复。原事件最后更新03:37:40UTC，Main于04:10UTC确认超过30分钟无更新且无活动工具，stderr含断连重试；04:12:20UTC仅正常SIGINT原客户端PID43827（父43826），退出1。服务端原因 **UNVERIFIED**，客户端中断不记为测试或Review PASS。Main原日志只读保留，原文件SHA、脱敏诊断与恢复记录见 [中断证据](../evidence/step-07/coding/client-recovery/record.json)。最新4f源码、固化Manifest、历史失败和测试结果均未改写，正式Review仍0/5；恢复后仅补证据/文档、核对哈希并本地提交。

作者未识别剩余P0/P1/阻断P2。剩余门禁：Main安排最新完整候选Independent Reviewer、必要远端CI及预授权技术放行/发布；作者不自行IndependentPASS/Approve/Merge/Push。新产物MZ GUI/游戏、用户亲自美术、Original Native Host及旧Map003延期仍NOT_EXECUTED；真实模型/SDK/Prompt生产体系和08–10未执行。此处停止等待Main。
