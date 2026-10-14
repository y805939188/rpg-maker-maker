# 步骤07 CI历史检出 Coding 交接

状态 **SELF_TESTED_READY_FOR_REVIEW_ROUND6**。本次只修CI执行前提：checkout明确`fetch-depth: 0`，使真实已发布06 writer回归能读取历史Git对象。当前授权范围未修改产品功能、正式tests或断言。新候选仍需Main独立R6、候选CI和发布；作者不批准、合并、推送或写canonical，08–10 NOT_STARTED。

## 版本、父审查和产物

| 对象                       | 精确绑定                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| 新Source / CI配置候选      | `e195da91dbf9e77f50492461074641e3f6000aed`                                                   |
| 父作者docs HEAD            | `5c3361b9cb28a49c7cbdcabf28f03c8eba470d6d`                                                   |
| 父R5产品Source             | `59423201ba10ee71c3d1b04cebec69659017b7c7`                                                   |
| R5独立原report SHA         | `81743cc098390f726ccba1c8548e253b303998b16e53d02bc62dd8b1be45ff85`                           |
| 本轮docs HEAD              | 本报告/ledger所属的后续纯文档提交；完整SHA在最终回复及私有coding-progress，避免自引用虚构SHA |
| 新工程BuildIdentity        | `step07-e195da91dbf9-cf827da07ee0f112`                                                       |
| 新工程Manifest SHA         | `000dec0cb73b8eb9384c6bbe895c388049de9bd6a07ccdd62aa742f8eb40a395`                           |
| 实际完整TargetProfile hash | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`                           |

[父R5原报告与SHA](../evidence/step-07/ci-history/results/parent-r5.json)精确归属594/5c3361，R4三个阻断已由独立R5 CLOSED，其他原回归保持。正式已用5轮，下一轮6；2026-10-14用户取消机械五轮上限，不清零历史、不降低门禁。R5 PASS不自动覆盖本次CI执行配置变化。

新源码提交的唯一差异是`.github/workflows/ci.yml`三行：说明旧writer依赖的comment、`with`和`fetch-depth: 0`。3665个父tracked文件中，其余3664逐bytes/SHA未变；195个非docs/README/CI的源码、tests和配置与594精确一致，包括`r4Legacy`所有调用和断言。[Source保护](../evidence/step-07/ci-history/results/source-preservation.json)、[冻结](../evidence/step-07/ci-history/results/source-freeze.json)。后续仅本报告和证据资料，无schema/锁/Profile/Compiler/槽位/动画/模型或其他执行配置变更。

新206文件工程产物按既有`pnpm build:step07`产生在本树私有完整检出：`.local/step07-ci-history/full-history-workspace/artifacts/step07-e195da91dbf9-cf827da07ee0f112/`。完整检出Git clean、源码精确e195；全部live与不可变artifact文件逐bytes/SHA相同。与R5工程payload相比仅`apps/api/dist/resources/studio.json`的`context.commit`改为e195，其他资源内容及205文件原字节相同；原运行树206个dist文件和旧Manifest未改。[新固化Manifest](../evidence/step-07/ci-history/engineering-manifest.json)、[206实际重读](../evidence/step-07/ci-history/results/engineering-verification.json)。原Build/ledger/报告不覆盖，新Manifest的独立Review和批准仍NOT_EXECUTED。

## 实际浅检出反证与最小修复

原CI只有一个固定`actions/checkout@11d5960a326750d5838078e36cf38b85af677262`，未设置fetch-depth；没有后续git fetch/unshallow/history步骤。setup/install/build脚本也未隐含补取history。固定action的[action.yml](https://raw.githubusercontent.com/actions/checkout/11d5960a326750d5838078e36cf38b85af677262/action.yml)、[input helper](https://raw.githubusercontent.com/actions/checkout/11d5960a326750d5838078e36cf38b85af677262/src/input-helper.ts)和真实runtime bundle均验证默认深度1；[fetch实现](https://raw.githubusercontent.com/actions/checkout/11d5960a326750d5838078e36cf38b85af677262/src/git-command-manager.ts)确实向Git传递深度参数。官方固定源码原件仅私有保存，公开记录URL、原SHA/bytes和小段default表达式。[原件索引](../evidence/step-07/ci-history/results/checkout-upstream.json)、[实际runtime核对](../evidence/step-07/ci-history/results/checkout-runtime-default.json)。

在自己`.local/step07-ci-history/`创建全新bare origin，只从本树读取父5c3361及祖先；新独立仓库用真实file transport执行固定checkout对应的`git fetch --depth=1`和checkout。实际HEAD正确、只有1个可达commit、is-shallow=true、无object alternates，没有local clone忽略depth或共享对象的假控制。

随后按未改`r4Legacy`精确读取`c227f8c6ecfe85895937013e4687deb40247a6ee:packages/persistence/src/{store,storage,gate,domain,replay,config}.ts`。**六个真实git show均exit128**；原stderr/argv/cwd/bytes/SHA保存，当前源文件存在也不能替代缺失历史对象。反证只是捕获执行前提缺陷，不是产品测试PASS。[完整反证与原命令](../evidence/step-07/ci-history/results/shallow-reproduction.json)、[store原错误](../evidence/step-07/ci-history/raw/shallow-missing-store.log.json)。默认浅检出目录原样保留，未对它补取对象以掩盖原失败。

最小修复采用标准`fetch-depth: 0`，避免以某个临时固定深度猜测c227距离。固定action的[source provider](https://raw.githubusercontent.com/actions/checkout/11d5960a326750d5838078e36cf38b85af677262/src/git-source-provider.ts)按0走完整branch/tag历史路径；权限、action pin、全部services/安装/检查/PG/两模式browser命令不变。用现有Ruby YAML/Psych解析前后配置，唯一语义差异就是checkout深度0；未添加依赖、跳过用例、改阈值或禁CI。[配置语义](../evidence/step-07/ci-history/results/workflow-semantics.json)。

冻结e195后另建全新完整检出，按该完整history refspec真实fetch/checkout；实际HEAD=e195、is-shallow=false、无alternates。六个相同git show均exit0，bytes/SHA逐项与真实c227对象一致。继续按原test模式用现有TypeScript ESNext/ES2022转译六文件、加载真实旧`Persistence`模块成功；没有以当前writer替代旧版，没有实例化连接数据库或改任何Job记录。[六源逐SHA/bytes](../evidence/step-07/ci-history/results/full-history-verification.json)、[真实转译/模块加载](../evidence/step-07/ci-history/results/legacy-module-load.json)。这验证检出/转译/依赖加载前提，未声称本次重新跑PG发布行为。

本地用固定action源码核对后执行对应真实Git命令；未本机执行整个GitHub action（避免其默认global safe.directory/credential设置）。验证使用本地file Git transport，未冒称已在GitHub Ubuntu runner或PR merge ref执行。新候选远端CI仍需Main。

## 本轮执行与原失败

| 实际动作                                                             | 结果                                                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 新空独立默认浅检出                                                   | 1可达commit、六次旧git show exit128，预期反证；15项原命令/检查记录保存                                 |
| YAML语义与workflow Prettier                                          | 唯一fetch-depth0语义变化，格式通过；根方向检查13 workspace members通过                                 |
| 精确e195完整检出                                                     | 六源真SHA/bytes匹配、HEAD/非shallow/无alternates校验通过                                               |
| 隔离`pnpm install --frozen-lockfile --store-dir <own-private-store>` | exit0，24.553s，已有Node22.21.1/pnpm10.20.0；独立node_modules/store，没有复制.env                      |
| 隔离`pnpm db:generate`                                               | exit0，1.598s，只生成Prisma client，无migrate/数据库连接                                               |
| 隔离CI格式 / 方向                                                    | exit0，0.681s / 0.234s                                                                                 |
| 隔离`pnpm build:step07`                                              | exit0，25.803s，真实TS/API/Web clean构建＋新不可变206文件工程包                                        |
| 隔离`pnpm verify:exports`                                            | exit0，11项production Node exports，0.858s                                                             |
| 原六legacy源转译和真实module import                                  | 重试exit0，精确输入和所有SHA记录；未实例化Persistence                                                  |
| 保护/产物重读                                                        | 3664父tracked、195产品/tests配置、原运行dist206不改；新live/immutable206全部一致，实际Profile hash匹配 |

[冻结后13项原命令记录](../evidence/step-07/ci-history/results/bound-commands.json)含12个exit0和1个作者辅助loader setup失败，不能写“全部首次成功”。第一次因新检出尚无ignored`.local`目录，shell未能创建辅助loader文件，随后Node MODULE_NOT_FOUND exit1；原log保留。仅创建自有目录后以新log重试，不改产品、tests或有效断言。[原失败](../evidence/step-07/ci-history/raw/legacy-module-load.log.json)、[设置错误](../evidence/step-07/ci-history/results/legacy-loader-initial-error.json)、[重试](../evidence/step-07/ci-history/raw/legacy-module-load-retry.log.json)。环境探测发现PyYAML未安装，使用已有Ruby标准库，没有安装新parser或改锁。

只读最终资源helper还曾假设初始PID一直存活，lsof退出1触发辅助收据异常；纠正收据采用实际状态，原异常保存，不当产品失败或新的资源安全承诺。[收据失误](../evidence/step-07/ci-history/results/service-snapshot-expectation-error.json)。本次未启动、停止或重启API/PG。

## 资源、未执行和交接

只写本Worktree `codex/step-07-studio`的CI配置、本报告/证据和自有`.local/step07-ci-history/`。独立Git origin/shallow/full workspace、private pnpm-store/node_modules、raw logs和工程包都保留。Node22.21.1仅显式本进程PATH；Git探针使用`GIT_CONFIG_GLOBAL=/dev/null`，不改全局设置。未复制任何.env、未migrate/reset、未访问DB/资产，未写Main/Reviewer/release tree或canonical。

初始只读观察API4376/PID22456、PG55476/PID51121运行；最终只读观察4376/55476/5276均无listener。作者没有任何服务生命周期动作；状态变化原因 **UNVERIFIED_EXTERNAL_STATE_CHANGE**，不自行归因或重启。原运行dist206仍逐SHA不变。[实际资源和范围](../evidence/step-07/ci-history/results/resources-and-scope.json)。

Main原候选70bcdcc3cdd44da983bddb87a0ece1057175f188、CI38464677883在授权消息中是RUNNING而非PASS。本轮作者未查询它的最终状态，不掩盖其其他失败；即使原CI最后通过，独立新空浅检出的缺对象反证仍成立。新e195候选的IndependentR6/候选CI/发布都未完成。

**本轮NOT_EXECUTED：** 全check266、HTTP/PG16、06回归23、API3/privacy5、production/development18+18浏览器、真实PG旧writer发布、像素/clock/ZIP/backuprestore/旧Pack/nativeCPU、GitHub checkout action/Ubuntu完整CI/PR merge ref运行。CI配置变化与195源码字节不变，因此本轮按影响验证检出前提、格式/方向、clean TS/API/Web工程构建及production exports；旧R5 whole-candidate实际结果单列归属，未冒称属于e195的新测试PASS。

**NOT_EXECUTED_BY_CODER：** 新IndependentReview、候选CI、Approve/Merge/Push/Release。真实视觉Provider/SDK/key/PromptRegistry/Composer/router/AI/收费/Redis/SaaS均未调用；新MZ GUI/游戏、用户艺术、Host/Map003/OS hidden仍未执行/延期。客户端step_coder/gpt-6.1-sol/xhigh/default(Standard)沿用原native CID，serverFinalFields **UNVERIFIED_NOT_EXPOSED**；无Fast/Priority/Ultrafast/collaboration或全局配置改动。[配置](../evidence/step-07/ci-history/configuration.json)。

[逐文件ledger](../evidence/step-07/ci-history/ledger.json)给出source/Build/Manifest、报告与全部公开payload的SHA/bytes；[原件索引](../evidence/step-07/ci-history/original-file-provenance.json)明确原日志/源/official pin原件路径、原SHA/bytes和脱敏copy SHA。旧R5及前轮全部报告/ledger/Build/失败保持原样。纯资料提交后停止，**STOP_WAIT_MAIN_INDEPENDENT_ROUND6**；不重复06发布，不开始08–10。
