# 步骤 05 人工 MZ 测试材料复核

日期：2026-10-13，Asia/Shanghai。本次仅只读复核文档提交和既有材料，新增本记录；未修改实现、正式测试、原报告、Manifest 或 MZ 工程，未提交/合并/推送。

**结论：可以开始人工 MZ 兼容性测试。** 步骤05整体仍为 REQUIRES_REVISION / CHANGES_REQUESTED，STEP05-IR-001 阻断P2未关闭，MZ实机尚为NOT_EXECUTED。允许使用已经生成并校验的材料测试，不构成步骤批准、失败保护通过或步骤06授权。

## 本次实际核查

- 当前HEAD为 `23d8386c6131610ce5351e55d6afb8b97da79b9e`，父提交为原DOCS_TARGET `ed189f7c274a7f397d261630bae396abb456665d`；开工工作区干净。
- 相对父提交仅README、基线、需求索引、旧独立报告/证据归档和`.prettierignore`精确报告路径变化，无生产源码/正式测试/锁文件变化。认可项登记保持阻断P2与未执行MZ状态，没有将材料可用升级为步骤PASS。
- 原独立报告SHA保持 `cb858df3d9a6096c76f492630f5ef3f83c5e739eee81f2b788ffa31595821a4c`；独立ledger中的44份证据SHA全部匹配。
- 验收ZIP SHA保持 `61f386e03ab0fec51bd2b51b00201643f9e25aa5c1301980dd9c9f38965ef07c`；95成员精确对应delivery，逐成员SHA匹配。八套Pack的64个标准文件与ZIP逐字节相同。
- 更新副本五份Map/System/Tilesets文件与来源及reference SHA相同；四张替换PNG与最终Pack身份匹配。核心SHA保持 `4ad828ae6cdd8b526e25591eaffd1ccf5ac4eb753f865f7ff48a0b3c821ff67f`，plugins为空。这是静态检查，未启动编辑器/Host/游戏。
- 当前turn_context仍记录`gpt-6.1-sol / ultra`，客户端tier为default；逐请求/服务端最终tier仍UNVERIFIED_NOT_EXPOSED。未使用未知Priority子Agent。

本次没有重跑210项测试：实现、测试及依赖未变化；本次新增直接证据为Git差异和既有交付的文件/hash复核，原独立测试结论继续绑定功能候选 `c09027f921e7d67469b301083db89acc44433d9e`，不改绑成文档commit。

## 人工测试使用方式

1. **首次安装：** 使用 `artifacts/step05-suite-c09027f921e7/incremental-v2/` 的A1/A2，在新MZ测试工程手动注册Area mode1、48px及指南中的flags。测试两组配套草/水，普通画笔的池塘/孔洞/L通道/对角与邻居重算。按指南可依序替换v1→v2→v3→v4观察新增、更新、退役保留。
2. **旧地图更新：** 先用Finder复制整个 `.local/mz/step05-update-c09027f921e7/` 到一个新的人工测试目录，再打开复制后的game.rmmzproject。先观察现存Map002/003：A组预期改色，B组保持旧色；形状/身份不顶替。随后在复制工程中作额外绘图，保留修改前后的地图证据。原步骤04来源工程与准备材料基线保留。
3. **真实运行：** 检查草可走/水阻挡，至少两个0→1→2→1周期，岸线不闪动，完成美术确认并记录实际Host分类。Native Core＋Modified NW.js、Original Host及RPGReactor分别记录，不能互相替代。

STEP05-IR-001影响export/suite/prepare/engineering发布路径的暂存目录清理；MZ读取现成PNG不执行这些代码。**该缺陷整改前，人工测试直接使用已有材料和手动文件复制，不重跑这些发布工具。** 保存新的验收记录并绑定c09027f、实际Pack Build/Manifest/PNG及地图SHA，不修改旧Manifest或将代码Review写成PASS。

当前材料可以产生这份具体产物的人工证据。Coding整改后仍须新候选独立复审；若重新生成产物，按实际文件hash、变化范围与门禁复核，不能自动把本次人工结果升级到不同像素或不同布局。

操作细节见 [MZ指南](../step-05/mz-acceptance.md)，已确认缺陷见 [原独立报告](step-05-independent-review.md)。本次只新增此记录，步骤06未启动。
