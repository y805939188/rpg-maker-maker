# 步骤 05 Pack / Layout / 标准导出契约

2026-10-13 用户授权当前会话 Coding、自测、构建、文档、MZ 验收准备及本地提交。步骤 04 功能 `44a5239a979cd549e893df705df7704d043216be`、文档 `af5b8e1c61175ca5627b15df37405e248bf26b37`、独立技术 PASS 与随后补齐的用户阶段验收为真实开发基线。新启动授权覆盖此前停止文字；不继承 Merge/Push/Reviewer 调度，不启动步骤 06。完整绑定见本轮 Coding 报告及唯一 evidence 目录。

## 模块方向与唯一规则来源

`pack-assembly → asset-core + mz-compiler`，核心无文件 I/O、codec、ORM、框架、供应商。根导出工具调用 image-adapter 和素材处理，新增成员先登记方向/构建/清理/ESM exports/工程构建。生产只读 dist 包声明，无 TS alias。

Profile 仍唯一来自 `src/profile.ts`，原文件/契约/母版不改写。Pack 接收完整 Profile，核对固定内容身份 `48844001eea07a8cf0da4baf9abb1653b01c38a9405413ed3123df189cf48793`；只固定身份，不再抄一套坐标。Compiler 继续拥有相对子块、语义区域、三源帧和放置约束；Pack 使用传入 Profile 的实际 slot 坐标，仅规划已声明 kind。Renderer 按已验证 Plan 复制像素，不分配或重算 quarter 规则。

## Pack v1 与操作语义

`mz-pack-v1 / stable-slots-v1` 快照含稳定 packId、正整数 version、Profile 内容身份、previousHash、完整四槽位、contentHash。槽位按 Profile 的 A1 再 A2 顺序记录，包括 NEVER_USED。绑定含独立 logicalId、正整数逻辑素材 revision、groundId、完整 Fragment 描述（source/recipe/parameters/components/dependencies/IR/pixel/placement 内容身份）。逻辑素材 ID 不取内容哈希；逻辑 revision 也不冒充某一源资产 revision。

`planPack(profile, request, history, fragments)`：request 必须精确包含 packId/version/operations；history 是从 version1 起的全部前序快照，按连续版本与 previousHash 校验；fragments 是本轮和历史依赖的真实 Compiler 拥有对象。序列化 JSON 片段仅用于复核描述，须从存档源重放 Compiler，不能伪造执行状态。

- `put(logicalId, revision, fragmentHash, groundId)` 新增仅用该类 NEVER_USED；操作按 ASCII logicalId 排序，首次选择 Profile 顺序中第一个空槽。
- 已 ACTIVE 的同 logicalId 更新保留原槽位；新 revision 必须递增。同 revision 只允许完全相同的绑定。片段类别不能改变。所有源/配方相同 kind+id+revision 在整个注册表中只允许一个 contentHash。
- `retire(logicalId)` 保留最后绑定、Fragment 和像素，RETIRED 永不变回 ACTIVE，也不能自动复用。重复退役保持语义。不存在的 ID 拒绝。
- operations 是显式变更集，遗漏保持原样；不是以列表替换完整快照。完整快照只能经 validatePack 读回，不能通过删条目隐式清空。一次请求同 logicalId 多项操作拒绝，失败不返回新有效绑定。
- purge/clear/delete/reuse/profile migration 不提供，未知操作/字段拒绝。容量为草地2、水面2；没有紧缩、移动、分配保留区域或 Tile ID 迁移。

快照/Plan 深冻结并拥有 JSON 副本；像素由 RgbaImage 独立持有，bytes/pixels 返回副本。旧快照不修改，历史必须拥有各自依赖才能重建。V1 本地边界最多256快照/1024 Fragment，变更集最多8项；源归档最多128配方、累计32MiB PNG。不是数据库存储、任务执行器或分布式锁。

## 固定配套与退役边界

每个 water 的 groundId 必须对应包中草地，双方使用同一处理 IR、精确 dependencies/recipe/parameters/density，草地 source components 包含在水面依赖中。实际配方/固定 mask 由步骤 03/04 复用验证。新草地+旧水面拒绝，须重建相应配套。历史新版本出现不改变旧 Pack 合法性。

RETIRED 仍占用图集并按最后有效配套验证。若保留的退役水面依赖 grass@3，则不能把该绑定草地换成 grass@4；这会破坏兼容岸线，当前明确拒绝。可以一起退役整组，仍保留原画面；没有“退役就透明”的隐含动作。更新外观可以改变旧地图画面，本步保证逻辑槽位身份不被顶替，不保证有意更新后像素不变。

## Layout / Atlas 硬校验

`mz-layout-v1` 含 snapshotHash/ProfileHash、所有 ACTIVE/RETIRED 的绝对位置、尺寸、Tile kind/shape0 ID、状态、绑定和自身 contentHash。validateLayout 先验证全部历史及当前 Pack/实际 Fragment，再重建唯一允许的 Plan，逐字段比对；普通 JSON、修改后重新计算哈希也不能跳过来源/状态/位置/重叠校验。

检查目标一致、类型、逻辑ID唯一、完整槽位、历史不移动/替换/清空、revision不可变、退役内容保持、配套依赖、Fragment内容身份、alignment、atlas bounds 和不重叠。Renderer 产生完整768×576 A1/A2，未用及保留区域RGBA全零，占用片段无缩放/平滑/Alpha变更；退役区域保留原像素。

## 导出与身份

根 `scripts/pack-export.ts` 归档/重放六个 PNG 源、provenance、style/parameters/recipe 精确版本；真实链路为 decodeSource → processShoreline → buildProcessedAsset → compileFragment → planPack/validateLayout → renderAtlas → encodePng → decode校验。已有≤768×576编码预算足够，不提高 image-adapter 限制。

标准目录精确八文件：A1.png、A2.png、pack.json、history.json、layout.json、sources.json（自包含六源PNG base64及版本配方）、INSTALL.md、manifest.json。离线可重建历史，无数据库或私有 .env。Manifest schema `mz-pack-build-v1` 绑定 Pack/Plan/Profile/Compiler/Assembly、源码commit、锁文件、实际Node/codec、bindings、逐文件bytes/SHA、图集尺寸/raw像素SHA、推荐MZ配置和实际结构验证。Build ID 从不含自身ID的 identity 内容摘要产生；manifest不包含自身最终SHA，SHA由外部证据记录。

readPackExport 核对精确文件清单、普通文件/体积、所有源实际重放、Pack历史、Plan、真实PNG逐像素、说明和Manifest重建一致，不仅各自JSON合法。后续 Review/MZ/视觉结果另存，Manifest不修改。PNG字节确定性限相同encoder环境，像素身份与新commit包装身份分开。

publishDirectory 拒绝已有目标，以新stage写wx、完整重读校验、rename发布，失败清理自身stage，保留以前成功目录；仅单机CLI本步机制，不是步骤06的DB事务/CAS。suite同样在stage完成所有子导出和index后发布。相同目标重复执行明确拒绝，可在新的目标目录重建并比较哈希。

```sh
pnpm build
pnpm test:step05
pnpm build:pack-sample
pnpm export:pack <suite中的request.json> <不存在的新目录>
pnpm verify:step05 <正版rmmz_core.js> <Pack目录>
```

正式构建要求干净已提交候选。当前一步不替用户改 Tilesets.json、地图、全局MZ/NW.js。首次安装与旧手绘地图替换见 [MZ材料](../step-05/mz-acceptance.md)。旧手绘地图已使用全部槽位，旧图分支无法新增第三组；新增明确失败，另用增量Pack展示A→B。不得以复用退役/改旧地图来满足不可能的容量要求。
