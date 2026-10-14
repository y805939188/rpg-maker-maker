# 步骤07 第十五轮独立 Review

结论 **REQUIRES_REVISION**。冻结功能候选 `39ec791c4b79c20f2afb3ac88ed5bc06dfb71bfd`，作者文档 HEAD `2320e9e9fbfea2ad8e60ab29dafdeef91f0075eb`。本轮为独立 Ultra / Standard；服务端最终 tier 不暴露，记 UNVERIFIED_NOT_EXPOSED。

完整 [原始报告](../evidence/step-07/independent-round15/report.md) SHA256 `83207c1ab20234ab0c3027f5ad11e6f2cb2b211935b26a0f8b667d2bf50881c1`，23579 bytes；[原 ledger](../evidence/step-07/independent-round15/evidence/ledger.json) SHA256 `6d2b15f29531b340e3f99a24948bc334f1fd0130d32ed27d34f1fb1e9d172dc3`，166 payload 全部由 Main 实际验真保存，未改写原结果。

P0=0、P1=0、阻断 P2=1：**STEP07-R15-001**。必需 processed PNG 测试消费者只有字节身份/解码/像素校验，缺少容器与逐 chunk CRC；真实同一次 HTTP 请求收到仅 IEND CRC 一位变更的无效 PNG 后仍通过。完整六阶段原消费者在两模式接受十张坏件，是反例而非 PASS。报告精确位置、独立 CRC oracle、原反例和最小方向全部保留。必要整改应在同一实际浏览器请求字节上验证完整 PNG，再保留原请求身份、framing、SHA、尺寸与像素证明；不得放宽预算或改变 Compiler/Profile。

本轮正常 check 358、HTTP 16、生产与开发浏览器各18通过；这些结果不抵销阻断。步骤06持久化专门23及性能专门探针是原轮证据 NOT_RERUN_THIS_ROUND。首次 main CI 38586177993 仍 FAILURE；当前代码已在已发布历史中，但步骤07尚未正式 PUBLISHED，需要新的 forward 候选、独立 PASS、候选 CI、正常整合、合并后回归和 main CI。

[资源关闭收据](../evidence/orchestration-06-07/step07-review15-owned-service-stop.json)：仅独占 PG55511 正常停止，API4411/Web5311已停止，9库与全部 private data 保留。下一轮按真实编号16继续；步骤06保持 PUBLISHED，08–10 NOT_STARTED。
