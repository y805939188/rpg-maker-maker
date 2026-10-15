# 步骤07第18轮：最后测试差异独立确认

**PASS_CURRENT_DIFF（环境适配验证）**。Source `d0a6f162a2b57634f7f10d0f5c49eab2168bb6a8`，作者资料HEAD `cfb3f6a88b22a4cbfce27304d841d2628e6f5a76`；唯一执行差异是在项目列表恢复测试安装假时钟前等待既有交付就绪屏障，两行新增，生产代码不变。P0/P1/硬阻P2及开放非阻断均0。

[原报告](../evidence/step-07/independent-round18/report.md)：12040 bytes，SHA256 `0e12f4c54b4c407b8ee362e39a447eda0c63fc2944c10de33052a3009859b4c2`。[原ledger](../evidence/step-07/independent-round18/evidence/ledger.json)：17491 bytes，SHA256 `7db7cef2cd7129a10b09e4e64a3eebcd9607693dd0b200393ffaa375b11a33b4`，96项由Main逐SHA/bytes验真保全，原文未改。

独立旧顺序在原30秒ready断言失败，新顺序同控制通过；受影响的既有用例生产、开发各1/1通过，零跳过重试。独立核对真实列表、当前项目/处理PNG归属、交付画布、无自动重试、显式恢复无POST及卸载行为。9588个tracked文件起末字节一致，Git clean。作者完整check418、生产18、开发18另有精确冻结证据，不能冒充Reviewer本轮执行。

初始默认headless shell存在独立最小页面RAF/图片decode/截图异常，`.local`下开发入口被现有Vite规则403拒绝，原失败均保留。有效验证使用同版本完整Chromium及独占物理临时镜像，未改正式源码、断言、预算、CI或私有目录保护；详见原报告。远端CI38690964177没有上传trace，其确切失败时序仍UNVERIFIED，不能用本地控制证明远端当次根因。

[第17轮完整功能PASS](step-07-independent-round-17.md)、候选CI38683352144和功能main CI38686901060继续按相同生产源码复用（REUSED_NOT_RERUN）；本轮不是新的06–07全量PASS。步骤06不重审重发，08–10未启动。指定sol/ultra/default客户端核对，隐藏服务端字段UNVERIFIED。原16保持INTERRUPTED/PARTIAL。

按最新用户收敛授权，当前差异技术放行 **APPROVED_BY_PREAUTHORIZED_ORCHESTRATOR**。最后正常整合、Push、远端读回和完整main CI仍须由Main实际完成，结果在最终会话回复；本索引不提前写未来成功。
