# 步骤07列表恢复用例的假时钟隔离

**SELF_TESTED_READY_FOR_INDEPENDENT18 / STOP_WAIT_MAIN_REVIEW18**。本轮仅修复已暴露的列表恢复测试夹具时序，不改产品行为。正式独立已用17轮，下一18；历史轮次、R16 INTERRUPTED/PARTIAL、旧失败和Manifest全部保持。Coding未独立关闭问题、批准、合并、推送、触发远端CI或写Main canonical。06保持PUBLISHED，08–10 NOT_STARTED。

| 绑定                          | 实际值                                                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| worktree / branch             | `/Users/dingshinn/.codex/worktrees/step-07-main-ci-recovery/rpg-maker-maker` / `codex/step-07-main-ci-recovery`                    |
| 本轮起点                      | `2157489dd739a8f8a02aa2c9cf47ad7319e14c7f`                                                                                         |
| 冻结Source                    | `d0a6f162a2b57634f7f10d0f5c49eab2168bb6a8`                                                                                         |
| docsHEAD                      | 本报告所在后续纯资料commit；提交后final handoff/private progress读回完整SHA，避免自引用循环                                        |
| 工程Build                     | `step07-d0a6f162a2b5-4d9d8ad25d20a5e7`                                                                                             |
| Manifest SHA256               | `85fc90888109c287e435d27c1b23da29a742db615709b6e4c3c1c3fc68b57be7`                                                                 |
| 实际文件 / 相同R17工程payload | 208 / 207                                                                                                                          |
| Manifest位置                  | `artifacts/.step07-list-clock-final-77df84a024444562bf63f81f41b3bcd7/artifacts/step07-d0a6f162a2b5-4d9d8ad25d20a5e7/manifest.json` |
| Full Profile canonical SHA256 | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`                                                                 |

客户端实际配置收据核对step_coder / gpt-6.1-sol / xhigh / default(Standard)、当前cwd、原CID；隐藏server final model/effort/tier **UNVERIFIED_NOT_EXPOSED**。无Fast/Priority/Ultrafast/collaboration、全局配置或代理变化。

## 原失败与可核实因果

Main真实CI **38690964177/job116276522135** 在2157489上失败，原146082byte日志SHA256 `62c5f7eeae7f8f23b7ce7ae8ee0a50cda7a05f47cd5f40c2ce5eaf9f8c43379e` 已完整读回。check418/API3/privacy5/PG23/HTTP16通过，生产17通过1失败，开发未执行；不把未执行写PASS。唯一错误是 `studio-project-list.test.ts` 列表503后快进81000ms、显式恢复列表，再在原30000ms `currentReady` 看不到交付就绪标志。CI trace没有上传，**远端当次具体顺序及因果仍UNVERIFIED**；不宣称看过缺失trace，不把原失败重标PASS或盲重跑。

本树物理隔离检出、全新自有DB/root、真实Chromium中，使用相同有界route屏障对照：GET项目列表503；真实初始Studio200延至clock安装后才交付；真实交付描述200在返回页面前挂起。没有伪JSON/PNG、额外素材GET、重新处理或重建来补证据。旧顺序快进81000后，真实描述请求被 `net::ERR_ABORTED`，页面显示“读取超过60秒预算”，原30000ms画布断言失败；后端successfulBuildId与COMPLETED Job仍正确。**old exit1/43.693秒是预期反例捕获，不是坏产物PASS。**

同一屏障控制应用两行修复后，首次currentReady先释放并实际完成上述资源，画布与当前处理96×144图像均就绪；之后快进81000仍就绪，无资源deadline/abort。完整原用例含列表无自动重试、恢复只读无POST、恢复后currentReady、卸载取消全部通过：**new exit0/13.4秒**。控制为prefreeze，所用e2e文件SHA与最新冻结Source逐字节相同；不把prefreeze当最新完整check/18+18。控制脚本每次afterEach另外读一次Studio仅作只读健康诊断；初始receipt的newServiceGets=0只意指无额外素材/构建请求，原收据保留并附明确勘误。控制文件及请求记录、截图、原失败均保留；不把这一可复现夹具干扰扩大成未经证明的远端产品缺陷。

## 最小变化和完整最新验证

唯一执行差异为 `e2e/studio-project-list.test.ts` 在列表失败已可见后、记录reads和安装假时钟前调用既有currentReady，并加一条说明注释。该屏障先要求实际交付Canvas就绪、当前project处理PNG归属及natural尺寸96×144，再观察列表自身的81秒窗口。保留原90秒case/30秒ready/15秒图像归属/81秒逻辑窗口、全部原断言、原卸载1300ms响应控制；没有增加sleep/timeout/retry、删skip用例或变更正确基准。其他列表迟到上传/失败/采用/创建与项目选择控制不改。

基于起点9588个tracked路径逐SHA/bytes读取，只有此文件变化。与R17 Source0c3比较，207个非docs/README文件中206个完全相同，另一个仅上述两行。生产Web/API/持久化/executor、PNG政策/真实received observer/CRC、环境I/O、严格ZIP、CI安装顺序、Schema/migrations/lock/Profile/Compiler/槽位/动画时基/通行均逐字节不变。

最新clean冻结Source在另一正确物理artifact clone、独立frozen依赖、NO.env显式进程配置及全新独占DB/root实际执行：

| 命令                | 作用                | exit | 秒      |
| ------------------- | ------------------- | ---- | ------- |
| `pnpm check`        | check               | 0    | 76.984  |
| `pnpm db:migrate`   | production-migrate  | 0    | 1.826   |
| `pnpm test:e2e`     | production18-noenv  | 0    | 419.544 |
| `pnpm db:migrate`   | development-migrate | 0    | 1.399   |
| `pnpm test:e2e`     | development18-noenv | 0    | 454.278 |
| `pnpm build:step07` | engineering         | 0    | 21.442  |

check **418/418**实际执行，原PNG raw-type/CRC/真实wire、strictZIP47、环境I/O等均保留；方向/type/lint/format/clean build/11包exports通过。没有把其内含的专项重复加计。**生产18/开发18各完整一次、0skip/0retry**，包括修复用例和原慢poll/迟到、资源超时/取消/BUSY、失败last-success、上传/固定配方/组件revision、真实构建/current/history/retired/旧包转换。实际处理图像身份、PNG dimensions/Canvas独立RGBA、播放暂停逐状态/nearest和选定Build/Export下载仍由未改原断言验证。

另以独立Python双目录/EOCD/安全唯一八成员/CRC/七payloadSHA/Manifest/Source/Profile重读 **6份实际浏览器下载、12张768×576 RGBA PNG**，每个PNG原始type/全部chunk CRC/终止、Pillow解码与像素hash验证；history ZIP完整bytes等于first，与0c3合法产物七payload逐字节相同。工程live及immutable每项SHA/bytes重算，实际208项中仅studio.json context.commit变化，其余207相同，完整Profile保持；旧Manifest未覆盖或补PASS。实际截图已view_image技术查看，不当用户艺术或新artifact MZ实机PASS。

## 引用范围、资源和停止

PG06完整23、HTTP16、API3/privacy5、专项旧Pack56payload16PNG/JS78/nativeCPU8、额外24scene/12+12 clock等 **NOT_RERUN_THIS_ROUND**。必要范围引用精确R17 Source `0c3dc30b0ebb4f64373fc4b3d32501a6048fe7de` 的wholePASS、candidate4cb CI38683352144及生产字节相同的main04e CI38686901060；报告/ledger/receipt原SHA和用途见historical-scope。仅本轮测试夹具变化，不将旧Source绿灯冒称新候选本轮执行，下一独立18/full新候选CI/正常forward main门禁由Main处理。

本树PG55509/PID85995真实目录归属核对，当前36个自有数据库保留（本轮5个新空DB，均未reset/drop）；API4409/Web5309、ownbrowser/native辅助已结束，PG由Main保留核归属停。own.env0600起末SHA相同，所有原31库、资产、失败、backup/cache均保留；不复制env，不读模型密钥。child-only NO_PROXY/no_proxy loopback，未改全局代理。用户Studio4376/PG55476及其运行树不写/构建/测试/停止，Main/Reviewer/release/canonical未写，不作他人运行状态静态保证。

无真实视觉SDK/API/key、AI/正式PromptRegistry/Composer/router、费用/Redis/SaaS/globalMZ/NW/Reactor，06不重复发布、08–10未开始。新MZ/用户艺术/OriginalHost/Map003仍NOT_EXECUTED或原延期。JS heap不是OS/native RSS硬cap，HTTP/native/PNG/Host/Origin/path/Vite预算政策不变。

Source后仅此报告和静态脱敏证据资料commit，无CI/运行执行影响。ledger按本树root相对路径逐SHA/bytes，来源/用途/精确旧失败与当前/引用范围分开；ledger不自指，最终docs/report/ledger哈希由提交后handoff读回。own DSN/password仅RAM扫描，公开零匹配，不公开env/完整ownership/dumps/私有输入/licensed runtime/trace。

**仅作者SELF_TESTED_READY_FOR_INDEPENDENT18；STOP_WAIT_MAIN_REVIEW18。**
