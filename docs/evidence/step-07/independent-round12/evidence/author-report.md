# 步骤07：R11浏览器安装顺序整改 Coding 报告

状态：**READY_FOR_REVIEW_ROUND12**。仅作者自测完成；STEP07-R11-001由下一独立Reviewer确认。正式已用11轮，下一轮12，历史不清零。06已PUBLISHED；08–10 NOT_STARTED。

本轮把既有唯一的 `pnpm exec playwright install --with-deps chromium` 从step06之后移至 `pnpm db:generate` 之后、`pnpm check` 之前。check已发现新增的5个真实浏览器响应生命周期测试，因此它成为首个浏览器消费者。原命令、次数1、固定Node22.21.1/pnpm10.20.0/Playwright1.64.0/Chromium1248、action pins、runner、权限、服务、其他步骤和全部预算/断言均保留。没有生产实现或测试修改。

## 候选与工程产物

- Source：`a8f23ef5ad218278447cca2d22c7014adb16ca02`，正常本地commit；父docs：`be6f40e9f551cdc1484293d46ab5884db1c0cc41`，父Source：`dc61fe03f64e644b7ac63057b3f7d7d26df547f8`。
- 4454个已跟踪路径中仅 `.github/workflows/ci.yml` 改变，4453个路径逐字节相同。精确单行移位核对和项目已固定yaml2.9.1语义解析均通过。辅助Python解析器缺失已记录，未安装依赖。作者首次证据汇总误用JSON插入顺序计算Profile hash而失败，改为既有规范的排序键JSON后核对48844001…；原helper/失败及一次不存在搜索路径保留，Profile/Manifest/测试未改。
- Build：`step07-a8f23ef5ad21-98ff2ad493f17c56`。
- Manifest SHA-256：`fad3661d65d8f290ec57f71579d37003db001746e5477fb5f48ccb4e99d3b637`；路径：`artifacts/.step07-r11-browser-order-e1d20da4eda743dfb56f7c4b421defe9/artifacts/step07-a8f23ef5ad21-98ff2ad493f17c56/manifest.json`。
- 206个不可变产物逐文件SHA/bytes并与该隔离检出的实际生产输出重新核对。205个与原594工程包相同；唯一差异为 `apps/api/dist/resources/studio.json` 的 `context.commit`，其他元数据一致。原594包与本树live206保持原样。
- Profile SHA-256：`48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`；schema/lock/核心Compiler/Profile/槽位/动画/通行承诺不变。
- 最终纯资料docsHEAD在本报告提交后的最终交接及私有coding-progress绑定；不制造自引用commit hash。本报告与ledger自身SHA在最终交接给出。

## 原反例与本轮实际验证

已完整阅读R11原报告并逐SHA/bytes核对188原件。report SHA `7063a62bbb09756cfa915a664715773d9978c718f66991e76a286f8c90e07a2c`（21483bytes）；ledger SHA `560094a37975eb69d1f8226632c748cec4fa1ac46ee5896c225d26cda5aa7b4a`。原冷check exit1，57.154s，344passed/5skipped；suite beforeAll找不到headless1248，clean build/exports未执行。原冷安装657.23s后被Reviewer取消、exit-15，installedControl NOT_EXECUTED；本轮保留原失败与取消记录，不改成成功。

本轮在自己的物理 `artifacts/.step07-r11-browser-order-*` 隔离完整检出冻结Source，独立frozen/offline依赖安装与Prisma generate，无 `.env`。使用明确的本进程配置与自有PG55476新空数据库，没有使用价值数据库。浏览器缓存是本任务新建路径，紧接安装前读回为空；没有复制已有浏览器字节，没有使用全局暖缓存。原指定安装命令向该缓存实际下载Chromium1248及对应依赖，exit0；随后同一缓存完整check349全部执行（0skip），其中5个真实生命周期用例已执行，另跑同5个作为直接控制。349包含这5个，不能写成354个独立用例。

| 本轮实际命令（精确冻结Source）                                                                                                                              | 结果  | 秒      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------- |
| `pnpm install --offline --frozen-lockfile --store-dir /Users/dingshinn/.codex/worktrees/step-07-studio/rpg-maker-maker/.local/step07-ci-history/pnpm-store` | exit0 | 2.784   |
| `pnpm db:generate`                                                                                                                                          | exit0 | 1.789   |
| `pnpm exec playwright install --with-deps chromium`                                                                                                         | exit0 | 436.836 |
| `pnpm check`                                                                                                                                                | exit0 | 75.299  |
| `pnpm exec vitest run apps/api/tests/studio/received-resources.test.ts`                                                                                     | exit0 | 2.484   |
| `pnpm db:migrate`                                                                                                                                           | exit0 | 1.871   |
| `pnpm build:step07`                                                                                                                                         | exit0 | 20.522  |

完整check包含boundary/type/lint/format/unit/clean build/11公开exports；strictZIP47、真实环境I/O31及其他既有用例通过。专门的5个生命周期控制继续验证真实浏览器接收、实际PNG解码/Canvas像素、所有权、当前文档与请求身份，原负控制与预算不变。fresh DB迁移成功、项目表为空；没有启动本轮API/Web。

这是真实macOS arm64冷下载/安装/launch证据。`--with-deps` 在Mac上的成功不是Ubuntu系统依赖证明；最新候选GitHub Linux mandatory CI由Main后续执行。本轮新IndependentReview、candidate CI、Approve/Merge/Push/Release均 **NOT_EXECUTED_BY_CODER**。

## 继承记录与本轮未执行

R11原暖缓存check349、API3/privacy5、HTTP16、production18/development18记录属于dc61父Source，原结论仍REQUIRES_REVISION，不能改写为本轮新Source独立PASS。其捕获生命周期正常及扩展控制支持未变代码；本轮没有重复HTTP16、PG06故障恢复23、API3/privacy5或两模式全18+18，因为diff只有安装顺序。原R5/R8/R10/R11已审生产、ZIP、真实IO、时钟、资源边界、恢复和历史等证据保留，不能重标为本轮作者执行。

新人工艺术确认、新artifact原生MZ实机验收 NOT_EXECUTED；旧Host/Map003延期保留。没有真实视觉模型/SDK/key/PromptRegistry/Composer/router/AI/付费/Redis/SaaS调用。没有修改HTTP/native资源预算；JS heap仍不等于OS/native RSS硬上限。

## 资源、证据与停止条件

原API22456:4376和PG51121:55476再次读回仍运行，本树 `.env` mode600、原live206字节保持。只新建本任务空测试DB并迁移，保留数据库、独立检出、缓存、不可变Build和全部原始日志；未reset/drop、未copy .env/credentials、未改原服务dist或服务生命周期、未触碰Main/Reviewer/release树与资源。

ledger：`docs/evidence/step-07/r11-browser-order/ledger.json`，逐文件SHA/bytes/原件路径/hash/用途/脱敏说明。私有原日志、辅助Python parser不可用记录及下载全过程保留；公开记录在内存核对自有敏感字节无泄露。docs提交后重新读回所有版本化payload，并审计Source之后仅本报告和JSON资料，无执行影响。

客户端配置沿本正式native会话为step_coder/gpt-6.1-sol/xhigh/default(Standard)，没有加速、collaboration或全局配置修改；服务端final model/effort/tier隐藏，**UNVERIFIED_NOT_EXPOSED**。本轮不独立关闭finding，不批准/合并/推送/canonical。交接后 **STOP_WAIT_MAIN_INDEPENDENT_ROUND12**；步骤08–10 NOT_STARTED。
