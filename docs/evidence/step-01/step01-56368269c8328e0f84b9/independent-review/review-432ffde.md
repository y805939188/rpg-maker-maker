# 步骤 01 plugins.js 格式修复 — 独立复审

Reviewer: `/root/plugins_format_review`，未参与 Coding。日期：2026-10-11，Asia/Shanghai。

**结论：本次限定范围的代码及工程准备复审 PASS，未发现需要修复的代码问题。步骤 01 仍 BLOCKED；未开始步骤 02。**

| 受测对象 | 身份 |
|---|---|
| Code commit | `432ffdef8d18e13950b14f290de3ae4f2f83aacd` |
| Build | `step01-56368269c8328e0f84b9` |
| Manifest SHA-256 | `1be77467ae7d5fab2c574dce1918d3c4a9a4b54b64a7beda0a42e89c8461351b` |
| Profile | `mz-native-ground-water / 1.0.0-candidate.1`，仍未实机冻结 |
| Pixel / Compiler | `rgba8-srgb-integer-v1 / fixed-prototype-v1` |
| Node / pnpm | `22.21.1 / 10.20.0` |

已完整阅读 AGENTS.md、两份正式方案及实施计划、MZ_RUNTIME_ENVIRONMENT.md、docs/reviews/step-01.md。审查 candidate commit 的三个代码/测试文件改动及完整 prepare/preflight 流程；本次未修改源码。

旧工程打开失败时使用了运行时有效但不同于编辑器序列化形式的 inline `$plugins` 文件。新代码在任何目标 mkdir 前读取正版模板 plugins.js，验证标准两行 generated header、独立的声明行及空 JSON 数组；拒绝缺失/损坏/非空/追加代码。解析不执行输入代码。prepare 写入预检时缓存的原字节，并在 reference 中记录 pluginsSha256。保留原模板字节也避免自行拼接再次改变编辑器可读格式。

**独立执行的验证：**

| 实际命令或探针 | 结果 |
|---|---|
| `pnpm test` | exit0，4 文件、52/52 测试 |
| `pnpm typecheck` | exit0 |
| `pnpm build` | exit0 |
| `node .local/plugins-format-review/probe.mjs` | exit0 |
| 函数边界独立用例 | 25/25 符合预期；含原格式、CRLF、空数组空白、旧 inline、BOM、错误 header、启用及禁用非空插件、损坏 JSON、附加代码、NUL、非法 UTF-8 后缀 |
| 无效模板实际 CLI | 6 种输入 × 空目标/已有目标 = 12 次拒绝；空目标连 .local 都未创建，已有 sentinel 原字节不变 |
| 正版模板实际 CLI | exit0，在独立 cwd 准备 639 文件，plugins.js 逐字节等于正版模板，空列表且没有启用模板插件 |
| 重复 prepare | 预期 EEXIST；639 文件 SHA-256 全部不变 |
| 已发布 build 保护 | 全部 5 文件 SHA-256 前后不变 |
| reference | commit/build/manifest/plugins 哈希正确；绘图、游戏、Native 验收仍 NOT_EXECUTED，Host 仍 NOT_VERIFIED |

正版模板只读路径：`/Users/dingshinn/Library/Application Support/Steam/steamapps/common/RPG Maker MZ/RPGMZ.app/Contents/Resources/newdata`。

模板和隔离输出 plugins.js SHA-256 均为 `2116dfda46bec80e7fab4b7e97b94931c47c9fb3642e6fa4c1625d0016b448a0`。

隔离输出工程：`.local/plugins-format-review/cli-good/.local/mz/step01-56368269c8328e0f84b9/`。该工程只保留在 .local；正版 Runtime/RTP 不入库、不对外发布。未并发创建主工程目录，未启动编辑器或 Host，未修改旧工程、全局 MZ/NW.js 或模板。

验证函数容许 CRLF、缺最终换行和合法空数组内部空白。边界用例只证明其接受/拒绝规则；本次实际 CLI 使用的始终是本机正版模板原字节，未把其他空白变体当作编辑器实测通过。

旧工程 `step01-fdf7768b475e24c66cfd` 的外部修补记录含用户原话“已成功打开工程”，可记为该旧工程修补后打开 `PASS_USER_REPORTED`。它不是新候选的打开、绘图、动画或 Native Host 验收。该记录 `note` 仍留有 “confirmation by user pending”，与已确认字段不一致，建议整理证据时同步修正文字；不影响代码复审结论。

本次结论限定为编辑器插件文件格式修复的代码及准备工具。新候选实际编辑器打开、普通画笔手绘、游戏动画/通行、人工美术确认、Native Host、Profile 实机冻结及用户批准均未由本 Reviewer 执行。此前 CPU oracle 与 unchanged PNG 的结构证据不能自动升级为这些实机结果。

日志与可复跑探针：`test.log`、`typecheck.log`、`build.log`、`probe.mjs`、`probe.log`、`probe-results.json`、`prepare-good.log`、`prepare-repeat.log`、`prepared-project-hashes.json`。证据文件 SHA-256 见 `evidence-hashes.json`。
