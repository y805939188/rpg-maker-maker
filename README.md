# AI Tileset Studio — 步骤 01 原型

当前仅实现 **MZ 原生可行性实验**。本地分支 `codex/step-01-mz-prototype`。
正式范围与依赖见 [产品方案](docs/plans/01_PRODUCT_TECH_SPEC_V0.5.md) 和
[十步计划](docs/plans/02_V1_IMPLEMENTATION_PLAN.md)。步骤 02 尚未授权。

Node `22.21.1`、pnpm `10.20.0`；安装后可以独立编译，不需要 AI、Web、数据库。

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
# 编译产物要求源码/母版已提交且 Git 工作树干净
pnpm prototype
```

`prototype` 从已入库的 96×144 RGBA8 母版生成两套 768×576 A1/A2：
编号诊断与原始像素美术。结果在 `artifacts/step01-<identity>/`，打印构建 ID、
源码 commit 和 SHA-256。相同身份拒绝覆盖；新代码提交生成新目录。
原型只做固定槽位复制，不是步骤 04 正式 Compiler 或步骤 05 Pack Assembly。

```sh
# 下列路径请换成本机正版 MZ 1.10.0 的 newdata 和上一步打印的构建目录
pnpm verify:mz "/path/to/newdata/js/rmmz_core.js" "/path/to/artifacts/step01-..."
pnpm prepare:mz "/path/to/newdata" "/path/to/artifacts/step01-..."
```

`verify:mz` 执行未修改的正版 Tilemap 选图方法，穷举两个草地/两个水面槽位的
48 形态和 4 播放状态，并逐像素对照独立母版、核对 241 个更新计数。
它属于 Node 原生规则对照，不能代替编辑器和游戏测试。

`prepare:mz` 只在全新的 `.local/mz/<buildId>/` 创建正版模板测试工程，不接受任意
目标路径、不覆盖旧工程或手绘地图、不重新分发正版运行时。
Map001 是程序指定形态；Map002/003 留空供实际编辑器手绘。
完整操作见 [MZ 实机验收](docs/step-01/mz-acceptance.md)。

`pnpm fixtures` 可复现原始母版，**正常测试不会重生成母版**。修改美术脚本后
需要显式审查 PNG 差异与来源清单。原始图片为项目原创、CC0-1.0；未使用第三方 RTP
图块或付费模型。美术母版是兼容性样例，用户视觉确认单独记录。

技术契约：[Target Profile](docs/step-01/target-profile-v1.md)、
[Pixel Contract](docs/step-01/pixel-processing-contract-v1.md)、
[研究记录](docs/step-01/research.md)。最终候选与门禁见
[步骤报告](docs/reviews/step-01.md)。
