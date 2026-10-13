# 步骤07 CI执行前提整合 Coding 交接

状态 **SELF_TESTED_READY_FOR_REVIEW_ROUND6**。整合候选仅保留checkout `fetch-depth: 0`并把既有Chromium安装移到首个真实浏览器消费者`pnpm test:step07`之前。产品实现、正式测试和断言不改；新Source仍需Main独立R6、候选CI和发布。作者不批准、merge/push、写Main canonical或其他tree，08–10 NOT_STARTED；06已发布不重复。

## 精确绑定

| 对象                                | 精确版本                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| 最新整合CI-only Source              | `87e13a8a99db3058dce8680d3ae985969b8a9bac`                                               |
| 直接父docs HEAD                     | `32923f333667757528834956e8aa23e09f62861c`                                               |
| 已完成history修复Source（保留未审） | `e195da91dbf9e77f50492461074641e3f6000aed`                                               |
| 原R5 whole-candidate PASS产品Source | `59423201ba10ee71c3d1b04cebec69659017b7c7`                                               |
| 本轮docs HEAD                       | 本报告/ledger所属后续纯资料提交；完整SHA在最终回复和私有coding-progress，无自引用虚构SHA |
| 新工程BuildIdentity                 | `step07-87e13a8a99db-cbff8b17e89c5bee`                                                   |
| 新工程Manifest SHA                  | `e186f5b1af6cd2cbe58f310f796cb9698119535a615a0e7db2bf94ed8f20ac97`                       |
| 实际完整TargetProfile hash          | `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`                       |

正式已用5轮、下一轮6；2026-10-14用户取消机械五轮上限，不清零历史、不降质量门禁。R5已独立关闭R4三个P2，但PASS精确归属594；不自动覆盖后续执行配置变化。[R5原报告/SHA](../evidence/step-07/ci-prerequisites/parent-r5.json)。[history报告](step-07-ci-history-coding.md)及其Source e195、docs329、旧Build/ledger/反证都原样保留，不amend或无痕改写。[旧资料精确hash](../evidence/step-07/ci-prerequisites/results/parent-history-binding.json)。

## 实际CI失败和第二个最小修复

Main候选`70bcdcc3cdd44da983bddb87a0ece1057175f188`的[CI38464677883](https://github.com/y805939188/rpg-maker-maker/actions/runs/38464677883)实际结论 **FAILURE**。作者只读下载原job日志的Main本地原件，103227 bytes、SHA `60a318ff8b476934fdf6a053577419b5b88b4007faa136486896b2a2eda6704b`逐字节一致；不用job API临时steps或缓存猜测状态。[原件来源](../evidence/step-07/ci-prerequisites/results/main-evidence-provenance.json)、[脱敏全日志及原hash](../evidence/step-07/ci-prerequisites/raw/ci-job-original.log.json)、[Main失败收据](../evidence/step-07/ci-prerequisites/results/ci-first-failure-main.json)。

日志显示原step06 23项通过；HTTP/PG16中14通过、2失败：真实旧c227 writer读取exit128，以及真实COMMIT/两个客户端浏览器case在`chromium.launch()`因`chromium_headless_shell-1248` executable缺失失败。这不是case已跑完，也不是e2e/完整CI PASS。

第一项由既存history修复处理：默认独立浅检出的6次旧Git读取exit128反证保持；当前完整检出6源SHA/bytes再次精确匹配已发布c227。[保留原浅检出反证](../evidence/step-07/ci-prerequisites/retained-shallow-reproduction.json)、[最新Source六源验证](../evidence/step-07/ci-prerequisites/results/bound-legacy-history.json)。没有用当前writer、JSON假状态或跳过case替代旧版。

第二项原因是旧workflow把`pnpm exec playwright install --with-deps chromium`放在`test:step07`之后，而新增HTTP case已经消费真实Chromium。本次只把这一条**不变的、唯一的安装命令**提前紧邻step07；没有重复安装、改runner/权限/Node/pnpm/Playwright版本/服务或预算。Playwright[官方CI说明](https://playwright.dev/docs/ci)同样要求先安装browser及依赖，再运行消费者；本判断主要依据真实日志、原test消费者和本地实际控制，不凭文档示例猜产品行为。

用现有Ruby YAML/Psych解析前后workflow，唯一语义变化是相邻两个step的顺序；安装次数精确1，install严格早于step07、production e2e、development e2e；fetch-depth0和所有其他字段/命令保持。[具体step索引/语义](../evidence/step-07/ci-prerequisites/results/workflow-order-verification.json)。Source提交只变`.github/workflows/ci.yml`，后续仅本报告/证据资料。

## 独立空缓存反证和真实正常控制

从项目声明的`@playwright/test`沿真实依赖解析`playwright`/`playwright-core`，三者均 **1.64.0**；包内注册表的Chromium和headless shell均revision **1248**、browserVersion **156.0.8078.4**。[真实安装包元数据](../evidence/step-07/ci-prerequisites/results/playwright-pinned-package.json)。首次探针误用根裸transitive包解析并猜测内部文件路径失败，原错误摘要保留，后按声明依赖链定位；未安装/升级依赖或修改lock。[路径探针失误](../evidence/step-07/ci-prerequisites/results/package-inspection-initial-error.json)。

在自己的新空`.local/step07-ci-prerequisites/empty-browser-cache/`，通过子进程`PLAYWRIGHT_BROWSERS_PATH`真正隔离缓存，直接执行项目1.64.0的`chromium.launch()`。实际抛出相同类型的缺headless shell-1248错误，cache前后为空。反证harness exit0只表示捕获预期缺陷，**不是浏览器启动或产品PASS**。[原错误](../evidence/step-07/ci-prerequisites/results/empty-cache-launch.json)、[原log](../evidence/step-07/ci-prerequisites/raw/empty-cache-launch.log.json)、[实际argv/env/绑定](../evidence/step-07/ci-prerequisites/results/pre-freeze-empty-command.json)。本机Mac路径与CI Linux路径分别保留，不冒充相同OS。

Source87冻结后，在全新独立检出的项目1.64.0依赖下，用本机已有**同revision1248**的标准browser缓存作真实正常控制。实际启动headless executable、读取browser.version=156.0.8078.4及真实DOM，然后正常关闭自己browser；raw launch command、实际启动的可执行文件SHA/bytes、版本、DOM和close收据可核验。[真实launch/二进制](../evidence/step-07/ci-prerequisites/results/actual-launched-browser-verification.json)、[原launch log](../evidence/step-07/ci-prerequisites/raw/bound-existing-pinned-browser-launch.log.json)。无fake browser、任意executablePath或channel替代，不访问现有API/PG，不重做无影响Studio全浏览器套件。

此控制证明指定版本启动前提；没有本机执行Linux`--with-deps`系统安装或新的GitHub CI，也不把已有缓存控制写成远端CI PASS。`--with-deps chromium`原命令仍完整保留给Main的新候选CI。

## 新冻结候选检查和不可变Build

独立检出根`.local/step07-ci-prerequisites/full-history-workspace/`精确HEAD87、完整history、无alternates、无.env；旧history检出/默认shallow现场和Build不动。只复用自己此前独立的pnpm package-store作offline frozen安装，无全局升级或他人env/DB/root复制。

| 新Source实际命令                                                                 | 结果                                                                                                                    |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| own file-transport `git clone --no-hardlinks --single-branch`                    | exit0，11.567s；精确Source、非shallow、6个旧源一致                                                                      |
| `pnpm install --offline --frozen-lockfile --store-dir <own prior private store>` | exit0，2.624s；新的独立node_modules                                                                                     |
| `pnpm db:generate`                                                               | exit0，1.789s，只生成client，无migrate/DB连接                                                                           |
| workflow Prettier / `pnpm check:boundaries`                                      | exit0，0.722s / 0.232s；13 workspace members                                                                            |
| `pnpm build:step07`                                                              | exit0，26.840s；clean TS/API/Web构建和新206文件工程包                                                                   |
| `pnpm verify:exports`                                                            | exit0，11项production exports，0.860s                                                                                   |
| 真实已有pinned Chromium launch/DOM/close                                         | exit0，0.653s；仅browser启动前提控制                                                                                    |
| 实际保护/206文件重读                                                             | 195产品/tests配置与594逐bytes/SHA一致，3728父tracked文件未改；新live和immutable206一致；运行树dist206及原e195 Build未改 |

[全部8项最新绑定命令](../evidence/step-07/ci-prerequisites/results/bound-commands.json)、[源码逐文件保护](../evidence/step-07/ci-prerequisites/results/source-preservation.json)。这些不是266单元、HTTP16或18+18全浏览器测试计数。

新Build在自己的独立workspace/artifacts，完整Manifest [原件](../evidence/step-07/ci-prerequisites/engineering-manifest.json)未改validation或追加PASS。206项逐文件SHA/bytes [重读](../evidence/step-07/ci-prerequisites/results/engineering-verification.json)，唯一与R5工程payload差异为`apps/api/dist/resources/studio.json`的`context.commit`绑定最新87，其余资源内容及205文件一致；完整Profile实际hash488…已重新核对。没有改正在运行4376的dist或固化旧Manifest。

## 更正history服务收据错误

**撤回上次history报告的“最终无listener”和`UNVERIFIED_EXTERNAL_STATE_CHANGE`推断。** 这是作者对probe结果的解释错误，不是已证明的服务变化。原组合argv为`lsof -nP -iTCP:4376 -iTCP:55476 -iTCP:5276 -sTCP:LISTEN`；exit1的原stdout其实已经列出API22456和PG51121。作者此前只看非零exit并错误推断所有端口无监听，未正确消费stdout。原报告/ledger/探针不改，作为历史错误保留。[原stdout/SHA](../evidence/step-07/ci-prerequisites/old-service-probe-original.log.json)。

本次真实复查：4376单端口lsof exit0/PID22456，55476单端口lsof exit0/PID51121，自有data根`pg_ctl status`exit0/PID51121；5276单端口exit1无listener。两个已存在端口组合exit0；加入未监听5276的原组合exit1，但仍打印两个运行PID。由此不能用组合exit1否定其他已匹配端口。[全部原argv/exit/stdout和控制](../evidence/step-07/ci-prerequisites/results/service-probe-correction.json)。Main同PID读回收据原件也验真，[Main依据](../evidence/step-07/ci-prerequisites/results/service-readback-main.json)。没有实际stop/restart证据，Main已明确未操作两服务；作者本轮和上轮均没有服务生命周期动作。

准确当前资源：PG55476/PID51121、自有`.local/postgres/data`运行；API4376/PID22456仍listen，运行树仍594资源/206原字节；Web5276无listener，.env0600/data存在。全部DB/资产/失败/备份不读写或reset，不启停PG/API，不复制env、不写Main/Reviewer/Release tree。[资源归属](../evidence/step-07/ci-prerequisites/results/resource-ownership.json)。自己的短暂Chromium仅用private TMPDIR，已正常close，未作全局browser安装/升级。

## 未执行、证据和停止

**本轮NOT_EXECUTED：** 全check266、HTTP/PG16、06回归23、API3/privacy5、prod/dev18+18、实际旧writer PG发布、Studio像素/clock/ZIP/backuprestore/旧Pack/nativeCPU、远端新候选CI、Linux系统依赖安装和GitHub runner execution。R5独立历史实际结果只归属594；前次history绑定检查单列，只归属e195。本次真实CI旧70失败不改为PASS；新87 Gate仍待Main。

**NOT_EXECUTED_BY_CODER：** 新IndependentReview、候选CI、批准/Merge/Push/Release。新MZ GUI/游戏、用户艺术、Host/Map003/OS hidden仍未执行/延期，真实Provider/SDK/key/PromptRegistry/Composer/router/AI/收费/Redis/SaaS均未调用。原native CID与step_coder/gpt-6.1-sol/xhigh/default(Standard)沿用，server最终隐藏字段 **UNVERIFIED_NOT_EXPOSED**；无Fast/Priority/Ultrafast/collaboration或全局配置修改。[配置](../evidence/step-07/ci-prerequisites/configuration.json)。

[最终ledger](../evidence/step-07/ci-prerequisites/ledger.json)绑定source/Build/Manifest、报告与每项公开证据的SHA/bytes；[原件索引](../evidence/step-07/ci-prerequisites/original-file-provenance.json)明确原始路径、原SHA/bytes与脱敏copy SHA。资料只用于来源、失败、整改、自测与用途审计，无执行影响。完成后 **STOP_WAIT_MAIN_INDEPENDENT_ROUND6**，等待Main下一门禁，不自行PASS或开始08–10。
