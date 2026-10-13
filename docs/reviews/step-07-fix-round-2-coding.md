# 步骤07 R2整改 Coding 交付

2026-10-13，Asia/Shanghai。**READY_FOR_REVIEW / SELF_TESTED_PENDING_ROUND3**。正式已用2/5，R2结论REQUIRES_REVISION；下一次正式3/5。以下均为作者实现与自测，STEP07-R2-001/002等待Main独立复审。作者没有IndependentPASS、Approve、Merge、Push、Main canonical写入或开始08–10。

| 绑定                     | 精确值                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| 最新完整source candidate | `5d926ad7ad6a68bfaff7ea2a51d4d3859c95d7c0`                                                           |
| 前正式source / docsHEAD  | `d343171ca866a8d1d1c4e272823ef475229d8032` / `1a3881edd3a076649f86794b05ac47f4c4c7a315`              |
| 中间未审source           | `b8e2def2f2b1ae87b1fa2fb980eda32431e6c4a3`；提交、失败、trace和全部原记录保留                        |
| docsHEAD                 | 随后的纯文档证据提交，精确值在最终回复与私有coding-progress；不伪造自身SHA                           |
| 分支 / Worktree          | `codex/step-07-studio` / `/Users/dingshinn/.codex/worktrees/step-07-studio/rpg-maker-maker`          |
| 工程Build                | `step07-5d926ad7ad6a-20f941ea79f60296`，206 payload                                                  |
| 工程Manifest SHA256      | `f9e96a59d295a66f77afc9b508a6f964b821f9f633f2d28080395b0aceadaca8`                                   |
| Profile内容hash          | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`，完整内容随标准Manifest封装，未改 |
| 生产browser首个DB Build  | `99355dfc5ad966c005539a125eae464cd43a1beb4198c62804b5e2c6aff24c8d`                                   |
| 生产browser最终current   | `48c4ef9806831855f8046c1059668263442d2b839fa38e7ac7236a499368e9a2`                                   |
| 同一首个标准Export       | `step05-pack-5d926ad7ad6a-764ae970bd4f3518`                                                          |
| Export Manifest SHA256   | `7f2ed69bfc7d9d5d0debf7c5fb30dca81ab7f49d0229fece9113d34508098cd3`                                   |
| 标准ZIP SHA256           | `80b074a1ff04a5a9cf292b69b2850d1d38729c4ff34b42f9051abdb2a1382849`；生产/开发一致                    |

原R2报告SHA `1411559d5e0d8376ef34caae414f643392b63b59ad45d59c36363fdf9f200a6d`、ledgerSHA `8e1eb20f132622968bf21f1c4204628bed94fc3a583fa30a88aaf62b7e25bf9a`及386 payload只读逐项验真，原件与完整私有副本保留。[原报告与逐项核验](../evidence/step-07/fix-round2/original-round2.json)、[原两个探针](../evidence/step-07/fix-round2/original-probes/poll-latency.mjs.txt.json)。原探针exit0仅表示捕获缺陷，不是候选PASS。R1路径P2和混合身份P3已在正式R2原范围由Reviewer独立CLOSED，本次维持回归，不自行重新判定或放开。

## STEP07-R2-001：P2 BLOCKING，已实施自测，待R3

同项目refresh共享唯一inflight Promise；poll改为当前请求settle后800ms再安排。保留project AbortController、generation、revision和成员身份守卫，切项目取消旧请求；60s读取预算有明确错误，上次成功数据保留。正常1300ms响应不会被新的800ms poll作废，无重复inflight或无限同时请求。

在未改d343生产dist上先真实复现：后台完成且5个COMPLETED payload送达，UI仍构建中；移除延迟后快控制恢复。旧反例及原图保留在[作者旧候选复现](../evidence/step-07/fix-round2/old-d343-reproduction/poll-latency/evidence.json)。最新5d两模式真实后台成功、容量失败、正常快控制及旧项目迟到验证UI终态/按钮/current与backend一致，最大poll并发1；没有提高原时限、移除身份保护或依赖用户刷新。[生产请求与终态](../evidence/step-07/fix-round2/browser-production/r2-recovery/poll.json)、[开发](../evidence/step-07/fix-round2/browser-dev/r2-recovery/poll.json)、[慢失败截图](../evidence/step-07/fix-round2/browser-production/r2-recovery/slow-poll-FAILED.png)。新增可控clock单元检查串行/失败/停止；不替代真实HTTP/browser证据。

## STEP07-R2-002：P2 BLOCKING，已实施自测，待R3

ProcessedPreview以project/recipe/sourceFrame绑定可取消fetch，切换/卸载abort旧读并清理Blob URL。当前交付descriptor先settle再启动processed，旧06受保护转换仍走原幂等入口；格式/HTTP失败呈现原因和显式重读。只有成功decode的96×144 PNG可发布，字节SHA/项目/配方/源帧明确；失败仅保留同owner上次成功源帧，并标明不是新成功图。

只对429/BUSY做有界恢复：最多5次，总60s，250/500/1000/2000ms退避；取消和deadline终止等待/请求，其他错误不自动重试。PNG流≤4MiB，MIME/签名检查、实际decode尺寸验证；没有无限queue、重试或后台旧项目渲染。开发StrictMode发送前一个microtask检查disposed setup，使已cleanup的首次setup不发送占槽请求；原5秒browser case保持。

原d343三个新context普通切换都真实BUSY/持续缺图，旧失败保留。[原复现](../evidence/step-07/fix-round2/old-d343-reproduction/switch-resource-race/evidence.json)。最新两模式各三次**无网络延迟/故障注入**的普通旧06→人工项目切换，当前三个源帧均decode为96×144，项目/recipe正确，PNG字节SHA及浏览器RGBA与实际API PNG一致；正常流程无400+、console error/pageerror或持续缺图。[普通切换](../evidence/step-07/fix-round2/browser-production/r2-recovery/ordinary-switch.json)、[实际图](../evidence/step-07/fix-round2/browser-production/r2-recovery/ordinary-switch-0.png)。

实际两个descriptor请求制造原1处理+1等待槽压力，真实429记录，客户端各模式4次请求后恢复，未超过5次；最终实际decoded PNG/SHA/RGBA/recipe匹配。切帧后离开取消，再实际下载ZIP200且SHA匹配。[压力/取消](../evidence/step-07/fix-round2/browser-production/r2-recovery/pressure.json)。另明确受控响应注入坏PNG200和TIMEOUT408，验证不自动重试、清楚原因/同owner上次成功、显式重读后真实API PNG有效；不把注入响应称作真实codec超时。[失败与恢复](../evidence/step-07/fix-round2/browser-production/r2-recovery/invalid-and-timeout.json)。原HTTP套件仍真实验证codec/read deadline及close后释放，新增第9项真HTTP等待取消→下载→PNG200复用控制。

服务端生产预算未改：请求16、下载2、读12、处理1+等待1、codec1无队列/5s，child close后释放。HTTP JSON8KiB/binary4MiB/5s读取/4096chunk、PNG singleRGBA8/sRGB/尺寸/density/metadata、assetID白名单/Host/Origin/client/root政策均保持。当前真实最大平面1,770,381 encoded bytes→1,769,472 RGBA，因Studio96×144拒绝，child RSS106,938,368 bytes/74.171584ms；JS heap128MiB仍**不是OS/native RSS硬上限**。[当前入口测量](../evidence/step-07/fix-round2/http-and-recovery/largest-http-decoded-plane.json)。

## 最新冻结候选验证

源码冻结后所有下列记录精确绑定5d；随后仅README/docs变化。[命令/退出码/耗时](../evidence/step-07/fix-round2/results/commands.json)、[工程206逐文件重读](../evidence/step-07/fix-round2/results/engineering-verification.json)、[194非文档源码SHA](../evidence/step-07/fix-round2/results/source-files.json)、[原文件与脱敏副本SHA](../evidence/step-07/fix-round2/original-file-provenance.json)、[ledger](../evidence/step-07/fix-round2/ledger.json)。2,073个受保护历史文件未变，实质差异仅8路径，生产Web与正式tests；API生产/native预算、Persistence/Compiler/Profile/Pack/schema/contracts/锁/plans/母版/配置未改。[范围保护](../evidence/step-07/fix-round2/results/preservation.json)。Web仍contracts-only，生产Node使用dist/声明exports。

| 实际命令/动作                                     | 最新结果                                                                                                               |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                      | 26文件263/263；10项新增读取/clock单元，方向、strict/lint/format、clean build、11生产exports；64.18s                    |
| `pnpm db:migrate`                                 | 5项既有迁移，无pending或数据reset；1.17s                                                                               |
| `STEP07_TEST_API_PORT=4376 pnpm test:step07`      | 9/9，原8保留+新增真实等待取消后下载；221.53s；实际PNG/upload安全、失败清理、R1路径、TX/CAS/late/retired/backup/restore |
| `pnpm test:step06`，自有新空regression DB/root    | 4文件23/23；198.80s含build，原60000ms单项预算；父gate/lease/事务fence/故障/Mock重启/备份恢复                           |
| `INTEGRATION_API_PORT=4376 pnpm test:integration` | 3/3，10.08s                                                                                                            |
| `pnpm test:dev-privacy`                           | 5/5真实Vite，10.06s；未扩大公开根                                                                                      |
| `API_PORT=4376 WEB_PORT=5276 pnpm test:e2e`       | 生产7/7，248.03s；原3+新增4，完整人工链、独立实际canvas像素/clock/ZIP/历史/R1身份与R2正常/失败恢复                     |
| 同端口 `E2E_MODE=dev pnpm test:e2e`               | 开发7/7，266.87s；相同真实标准Export/Manifest/ZIP身份                                                                  |
| `pnpm build:step07`                               | 新不可变工程Build，206/206当前磁盘SHA与固化Manifest一致，未覆盖旧出版                                                  |
| `pnpm build:pack-sample` / 已批准旧hash比较       | 8包16PNG；56 payload与批准05相同，context/Manifest source包装身份单列                                                  |
| 原public JS probe / `verify-step05` ×8            | 78/78、8套pinned native-core CPU对照，core SHA4ad828ae…；不冒充GUI/新MZ实机                                            |
| 真干净restore→API/browser                         | 源/配方/历史读回、实际重建current、processed decode/SHA/RGBA一致、旧ZIP原SHA；辅助API正常关闭                          |
| 自有生产部署entry实际browser                      | current Canvas与processed PNG正确，无console/pageerror/400+，API4376保留                                               |

完整人工链为创建/刷新持久状态、非法上传中文诊断、实际源组件/精确revision/固定配方、构建/更新配对素材、current/history/retired、失败保留last success、真正A1/A2+Manifest+完整Profile交付与实际ZIP。交付像素isolated/edges四状态共8组与独立手写scene/quarter/原始母版一致，并对照本地未修改native core；holes/channel/pond/large、nearest整数缩放/透明与固定60 logical updates/秒、30次/状态、0→1→2→1及暂停/恢复/hidden策略仍验证。[完整浏览器](../evidence/step-07/fix-round2/browser-production/evidence.json)、[实际像素](../evidence/step-07/fix-round2/browser-production/actual-canvas-edges-2.png)。没有用IR、源PNG或旧CPU截图冒充交付。

六份生产/开发ZIP真正解压CRC/精确八安全文件名/逐payload bytes与SHA，Manifest source/BuildIdentity/Profile hash核对；first/history/失败后保留ZIP与实际selected Export一致。[逐ZIP验真](../evidence/step-07/fix-round2/results/zip-verification.json)。恢复测试真backup→新空owned DB/不存在root→Studio读取/重建，current `84a7122bac7f43d3d2f283919157a2308553bb8f70eadcdccfeca453c9372b66`；旧history ZIP SHA `c0280a0ae55abfcb8ea376690e752463ac6546fa5482c8134fd18721b851aac5`保持。[实际恢复处理图/像素与ZIP](../evidence/step-07/fix-round2/restored-browser-complete/evidence.json)。内部durable4file与标准8file分层、源独立bytes/pixels所有权、public restore合法性、旧任务不回退current、stable slots/retired历史均未改变。

已用view_image查看本次5d关键截图，逐图SHA见[查看收据](../evidence/step-07/fix-round2/results/screenshots-viewed.json)。QA STRUCTURAL_PASS、视觉risk阈值/范围、人工确认、Profile既有基线、本artifact MZ实测分开；作者/Reviewer技术截图不写USER_CONFIRMED，旧Profile实测不自动ARTIFACT_MZ_TESTED。

## 原失败、会话恢复、资源与未执行

所有原报告、失败、b8提交/完整batch、trace、历史Build/Manifest/ledger/DB/资产原位保留。预冻结私有探针Request.url调用、独立HTTP fixture/recipe变量修正有原日志；不混入最新PASS。b8生产7/7、开发6/7，原5000ms case因StrictMode双读失败；5d只修发送前disposed guard并重新冻结完整验证，没删case/降阈/重置母版。追加恢复像素探针最初独立page.request缺baseURL，INVALID_URL仅私有探针错误；原脚本/日志保留，明确owned绝对URL后实际PNG/RGBA通过。[执行说明](../evidence/step-07/fix-round2/execution-notes.json)、[保留私有原件索引](../evidence/step-07/fix-round2/retained-private-inventory.json)。

同一CID `01a132c0-f44b-75f0-bea5-7f4e5e77a6ea`，客户端固定step_coder/gpt-6.1-sol/xhigh/default/Standard；服务端最终字段 **UNVERIFIED_NOT_EXPOSED**。本次是第2次正常客户端恢复：Main确认1018s无事件且无活动工具，仅正常SIGINT已确认owned PID12766，wrapper exit1；先前断连warning后曾继续命令，原因 **UNVERIFIED**。原events/stderr/诊断只读保存与SHA核对，不作为PASS，不修全局stateDB/role、绕平台或重置Review轮次。[恢复记录](../evidence/step-07/fix-round2/results/client-recovery2.json)。未使用collaboration或加速接口。

PG55476 PID51121、`.local/postgres/data`、自己的.env600及全部原/新DB/root/backup/失败保留；regression DB `tileset_step07_r2_regression06_24b52c39efc54473bcbea83a9e863262`真实新空创建后迁移，root为`.local/step07/fix-round2/regression06/24b52c39efc54473bcbea83a9e863262/assets`。restore位于`.local/step07/tests/de41c026-865e-46e3-a0e5-72c5fb918c2c/restore-assets`，DB `tileset_step07_f25ae59c4c6142948f55bdb17a985cbb`；无reset。恢复辅助API43028/48816已正常terminate并wait；首次失败helper也由finally正常关闭。当前生产API PID51670，资产`.local/assets`，入口`http://127.0.0.1:4376`，Web5276无listener；已真实访问。[运行归属](../evidence/step-07/fix-round2/results/retained-runtime.json)、[入口证据](../evidence/step-07/fix-round2/results/retained-entry-browser.json)。Node22.21.1/PATH仅本进程，pnpm10.20.0/PG14；启动顺序见[基线](../engineering/STEP_07_BASELINE.md)。没有写Reviewer55477/55479/55483或Mainrelease55481/env/root，也没关闭未知进程。

作者没有识别额外未处理的阻断实现问题，但本轮两P2仍**PENDING_INDEPENDENT_ROUND3**，不代替Main结论。IndependentReview/远端CI/Release为 **NOT_EXECUTED_BY_CODER**。新artifact MZ GUI/编辑器手绘/游戏、用户亲自逐图美术、Original Native Host/旧Map003延期、RPGReactor为 **NOT_EXECUTED**；8 CPU对照仅技术参考。真实视觉Provider/SDK/Key/PromptRegistry/Composer/router/AI workflow/Redis/SaaS/收费调用与08–10未执行，所有commands仅人工素材/Mock；无Wave key依赖。此处停止等待Main正式第3/5轮。
