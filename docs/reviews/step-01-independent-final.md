# 步骤 01 独立 Review — 最终代码候选

- Reviewer：`/root/step01_independent_review`，未参与实现；独立读取全部正式方案、执行计划和 AGENTS.md。
- 分支：`codex/step-01-mz-prototype`。
- 受测 Commit：`301d3cdb37743a53eff6046ccf2b23aea0ab8122`。
- 构建：`step01-ffc5300c7fb2cb94a48a`。
- Manifest SHA-256：`211790adf8aa421df3c0d525653141dbb4f545ddf1e9e83001199124e22c110a`。
- Profile：`1.0.0-candidate.1`，仍为候选。
- Pixel Contract：`rgba8-srgb-integer-v1`；母版来源版本：`original-fixtures-v1.1`。
- 审查日期：2026-10-11，Asia/Shanghai。

## 结论与门禁

**独立代码 Review：PASS。** 初审提出的实际缺陷已修复，本次独立反例、自动检查、构建身份/覆盖保护及准备工程静态检查均通过。没有遗留已知代码阻断或发现提前实现步骤 02–10 的范围漂移。

**步骤 01 整体：BLOCKED。** 正常 MZ 编辑器手绘、保留真实手绘 Map002/003、实际游戏动画/通行和用户美术确认均尚未执行，不得用本次代码 Review 或 CPU/VM 选图验证替代。用户批准亦为 NOT_EXECUTED。Profile 不得宣称实机冻结；不能进入步骤 02。

本 Review 绑定上述代码 SHA 与不可变构建。之后仅补充证据/报告的提交，不会自动改变这份构建；实质修改代码或母版必须重新评估并按影响复测。

## 亲自执行的检查与真实结果

| 命令/操作 | 结果及适用范围 |
|---|---|
| `git rev-parse HEAD` / `git status --short` | 正是上述 Commit，受测工作树干净；复审期间未修改源文件。 |
| `pnpm install --frozen-lockfile` | exit 0，依赖锁定可安装。Node 22.21.1 / pnpm 10.20.0。 |
| `pnpm typecheck && pnpm test && pnpm build` | exit 0；仅一个源测试文件，15/15 测试通过，不再执行 dist 副本。 |
| `node .local/reviewer/explore-png.mjs` | exit 0；原独立生成器的正常 RGBA8 接受，索引色+Alpha、合法两帧 APNG、线性 gAMA=100000 均被明确拒绝。没有改写反例来规避失败。 |
| `node .local/reviewer/more-png.mjs` | exit 0；独立构造 cICP=[9,16,0,1] 的 HDR/PQ PNG 被明确拒绝。 |
| `node .local/reviewer/crc-explore.mjs` | exit 0；独立破坏 IHDR/IDAT/IEND CRC，三者全部拒绝；未依赖 Sharp 对坏 CRC 的宽松行为。 |
| `node .local/reviewer/rebuild-301d3cd.mjs` | wrapper exit 0；实际 `pnpm prototype` 重跑三次，三次均计算出同一构建身份，并以 exit 1 / `Immutable build already exists` 预期拒绝覆盖。四张 PNG 与 manifest 前后哈希相同，无遗留 lock/stage。 |
| `pnpm verify:mz "<正版 newdata>/js/rmmz_core.js" artifacts/step01-ffc5300c7fb2cb94a48a` | exit 0；48 索引、两个草槽/两个水槽、两类母版、四水播放状态：960 次选图、2,211,840 个逐像素比较、241 个原生更新状态通过。 |
| `node .local/reviewer/pixels-301d3cd.mjs` | exit 0；五张美术/遮罩文件各检查 3,456 个 2×2 块，全为零错误；3,056 静态岸线像素零漂移，10,768 内部像素发生实际变化。 |
| `node .local/reviewer/render-301d3cd.mjs` | exit 0；直接取正版原始 Tilemap 方法从最终图集生成 48 形态 CPU 图。两水类 0/1/2 不同、1 与 3 像素哈希相同；草地静态。脚本未导入原型 compiler、oracle helper 或生产形态表。 |
| `node .local/reviewer/project-protection-301d3cd.mjs` | wrapper exit 0；再次调用 prepare-mz 时子进程 exit 1 / EEXIST，639 个已存在工程文件逐文件哈希及数量不变。 |
| `node .local/reviewer/project-audit-301d3cd.mjs` | exit 0；50 个准备工程入口/JS/WASM/字体/选定角色与菜单图像/默认音效/地图/图集依赖存在。launcher 哈希与引用记录相同，六份 core 与正版模板字节哈希相同，插件空，地图尺寸/Tile/Area/通行 flags 符合 Profile，手绘地图仍为空白。 |

原生 oracle 只在 Node VM 中执行未修改的原生方法、stub layer 与像素对照；独立 CPU montage 只证明给定索引的拼装与视觉检查。它们都不是实际 GPU 渲染、正常编辑器画笔选图或游戏启动的 PASS。

## 修复及增量审查

1. 原 PNG 解码 metadata 不能代表原容器格式：现直接检查 IHDR、动画/颜色块和全部 CRC；索引色/APNG/不支持颜色信息不会被暗中转换或丢帧。
2. sourceHashes 原并发插入使构建 ID 不稳定：现 Promise.all 保留输入顺序，再顺序写入；三次真实构建请求已确认身份一致和拒绝覆盖。
3. 凹角边界原在 1px 网格绘制，违反所写 2px 美术密度：现使用统一逻辑网格，母版以 v1.1 显式变更并绑定新内容哈希。已发布旧构建未被覆盖。
4. Vitest 原同时跑源/生成测试：现限制 tests/，原测试保留并新增真实 PNG 与密度回归。
5. 准备工程原缺 NW.js launcher：现创建 `package.json`，main=`index.html`、sRGB、816×624、现有 icon 路径，并补原生菜单角色脸图。launcher SHA-256 `995f476645fe91d87309575838b4bed9704add7045d07e94a472ba4c1542dc66` 与工程 reference 一致。实际 NW.js 启动仍未执行，不因静态配置正确而宣称游戏成功。

补 launcher 的唯一最后增量没有改变 compiler、Profile 或母版。最终新构建的四 PNG 哈希与前次已独立复核的 9e54506 构建一致，本次仍重新运行绑定新 manifest 的原生 oracle、CPU 渲染及不可变性检查。

## 构建关键哈希

| 文件 | SHA-256 |
|---|---|
| diagnostic_A1.png | de08f8bc36b87017afbb62aba946d612e8f4536939c0db707bbbbcbfd93b337f |
| diagnostic_A2.png | b493ecc86e938dc9aa4f389ba6b1b052222baeade6bb1d58dea7b003126330cd |
| art_A1.png | d896c5c8b62816e844865b2abe12a0d5c1694aceb6cd3c75f93eccbd6c55d9d2 |
| art_A2.png | 7d60ac8c6072d38736e4027cc25fa23979de6e400b9c66d4f586a108506b2b2b |

## 待完成的必要实机操作

在准确引用以上构建的新正版工程中，亲自核对 Area Type、两个草/水槽位及属性；使用普通画笔手绘孤立格、直边、内外角/孔洞、一格通道、对角接触和大片区域，保留由编辑器保存的 Map002/003 JSON 与哈希。测试游戏验证两水槽 0→1→2→1 播放、静态岸线和草地可走/水格不可走；提交对应截图/视频、操作者/版本与真实结果。人工美术确认另记。具体流程见 docs/step-01/mz-acceptance.md。

未来证据必须独立保存并引用 manifest/PNG 哈希；不能直接修改已发布 manifest 的 NOT_EXECUTED 字段。当前实现者已明确未能完成 UI/实机操作，本 Review 没有把任何未执行的验证标为 PASS。
