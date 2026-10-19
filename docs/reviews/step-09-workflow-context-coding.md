# Step09 workflow context Coding closeout

2026-10-19，America/Chicago。**READY_FOR_REVIEW（限定R9）/ SELF_TESTED**。基线 `6678f0021ed454014987d158f98aea56322e3796`；执行source **`3c2d405ecb9ce3e8d69ef325cf6213991ad5f7a8`**，本报告另提交，最终docs HEAD仅写ignored summary/main-request。实际客户端核对为本树cwd、gpt-6.1-sol / xhigh / 显式default(Standard)，隐藏服务端字段UNVERIFIED；未改全局配置，未派生Agent、Review、批准、Merge、Push或触发CI。

只读AGENTS及Main completion回执。CI39276281752在创建任何job前因四处job.env中的runner.temp非法而失败；旧R7/R8的限定PASS遗漏了GitHub上下文语义，旧报告和失败保持原字节，不改写为通过。功能/启动证据仅按未变范围复用，本轮不启动产品服务。

## 最小改动与校验入口

source仅三文件：`.github/workflows/ci.yml`、`scripts/check-workflows.mjs`、`package.json`。删除四处非法表达式；两个原有早期初始化step各自在shell中使用RUNNER_TEMP创建原名core/development临时及缓存目录，将TMPDIR/XDG_CACHE_HOME追加到GITHUB_ENV供后续step使用。缺少RUNNER_TEMP/GITHUB_ENV直接拒绝；没有使用全局配置或假准备开关。

新增 **`pnpm check:workflows`**，对应`node scripts/check-workflows.mjs`。作者已在本地提交/交接前运行；Main后续pre-push也应运行此入口，CI不能代替本地校验。core/development在Node22.21.1安装后、frozen依赖安装及任何构建/测试前调用同一脚本，不需要产品依赖或dist。原公共命令字符串、依赖/锁/Action版本、两job独立数据库和资产、全部测试/期限、30秒服务/120秒准备及source/output绑定均保持；baseline needs/always/严格双success聚合整个对象不变。私有harness将允许差异还原后与旧job对象逐项相等，package除新增脚本外JSON相等。

先查PATH，未发现actionlint；发现Go但未安装/构建工具。最终使用官方 **actionlint1.7.12** 发布资产API固定ID下载，不用latest/PATH中的未知checker。Darwin arm64 / Linux amd64分别固定资产384924893 / 384924896；其他平台明确拒绝。每次执行前验证archive SHA，直接从已验证内存字节解压至本次独占目录，执行后只清理该目录。工具归档仅在本轮ignored工具目录复用，每次重新验SHA；缺失/下载/摘要/解压/检查异常均非零退出，工具参数不允许传入ignore或规则覆盖，无规则被禁用。下载30秒、解压10秒、checker60秒，各自有界，无自动重试。

来源：[官方发布页](https://github.com/rhysd/actionlint/releases/tag/v1.7.12)、[固定版本上下文检查说明](https://raw.githubusercontent.com/rhysd/actionlint/v1.7.12/docs/checks.md)、[官方资产API](https://docs.github.com/en/rest/releases/assets#get-a-release-asset)。官方checksums文件SHA为`433028cf0ba3c42163ea1a668dedce30fcdbe84fe912b1a5e288c006eab8a4f5`；下载归档同时匹配发布manifest与GitHub资产API摘要：

| 平台         | archive SHA-256                                                    |
| ------------ | ------------------------------------------------------------------ |
| Darwin arm64 | `aba9ced2dee8d27fecca3dc7feb1a7f9a52caefa1eb46f3271ea66b6e0e6953f` |
| Linux amd64  | `8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8` |

`tool-provenance.json`另存两平台可执行文件SHA及Darwin实际-version输出1.7.12；Linux只下载并核对SHA/ELF，未执行。curl使用-q不加载用户curl配置，不携带认证token。没有全局安装或业务依赖升级。

## 实际验证与失败记录

证据根 `.local/step09-workflow-context-coding/`；launcher文件保留。`evidence/*.command.json` / 同名log记录完整命令、允许列表环境键、exit及外层耗时。

| 验证                                             | 实际结果                                                                                                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| FULL固定workflow，真实actionlint，经本地公共入口 | PASS，首次API下载+校验1952ms；私有harness再次调用CI同入口通过；不是YAML/Prettier替代                                                                |
| TEMP COPY仅恢复原四处job.env表达式               | checker exit1，准确四条`context "runner" is not allowed here [expression]`，副本行25/26/90/91；tracked workflow SHA前后相同                         |
| 运行时初始化及隔离                               | 两组原run正文在含空格的合成RUNNER_TEMP执行；mkdir正确、GITHUB_ENV原sentinel保留、后续模拟step读取两目录成功；父进程环境不变；两侧缺失必需变量均拒绝 |
| checker拒绝负控                                  | ignore参数拒绝；本轮自有归档合成损坏后在执行前因SHA拒绝，finally原字节恢复；所有独占解压目录清理                                                    |
| 上述定向harness                                  | 整体PASS，1482ms；实际完整诊断及原→新对象等价证明见context-regression-result.json                                                                   |
| 相关静态                                         | 新脚本ESLint PASS，936ms；全仓Prettier与git diff --check包含新增报告PASS，精确结果见最终command/log                                                 |

首个实现的Node fetch传输失败（exit1/10902ms）；改用系统curl后直连github.com发布URL超时（exit28/30404ms，0字节），另有10秒HEAD诊断失败，未声称查明网络全部原因。官方api.github.com实测可达，按官方资产API取得同一包，固定SHA不变；最终脚本只用该固定API路径，无自动fallback/retry。首次Lint报两处preserve-caught-error，首次格式检查报脚本格式，均修正后通过。全部原失败log保留，没有忽略错误求绿。

本地未安装ShellCheck/Pyflakes，因此actionlint默认可选外部集成本地未执行；没有传空开关禁用，CI已安装工具时会按默认规则检查。新完整GitHub候选CI/平台受理结果 **NOT_EXECUTED**，由Main安排限定R9与后续发布流程，作者不自行触发。没有重跑业务全套、启动性能/DB/浏览器/MZ验证。

## 数据与交接

仅新四个受控文件及本轮ignored输出变化；旧报告、Main canonical文档和其余tracked源码哈希保持。外部TMPDIR父根 `/private/tmp/tileset-workflow-context-wgjjqvgs`；合成初始化临时目录/工具解压目录只清理本轮自建部分，证据、归档和其他旧ignored数据保留。没有启动/停止任何服务，4398/PG55529未操作，全部DB/资产/预算/素材/MZ均未修改，未访问DB/预算/旧ignored资产/MZ；main .env.local/真实Provider密钥未读，AI调用0、H02未运行，10 NOT_STARTED。

Reviewer入口：source diff、`tool-provenance.json`、`context-regression.py`、`context-regression-result.json`、负控副本及其四条诊断、最终Lint/格式/diff日志。新 `main-request.json` / `summary.json` 绑定source/docs HEAD、范围、命令、失败更正及保护边界。**冻结后READY_FOR_REVIEW并停止，由Main安排限定R9。**
