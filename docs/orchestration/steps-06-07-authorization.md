# 步骤 06–07 本轮授权

2026-10-13（Asia/Shanghai），用户在「开发步骤 06–07 并发布」会话明确授权 Main Orchestrator 串行实施步骤 06、07 的 Coding、独立 Review、整改、真实数据库/浏览器验证、候选 CI、正常合并与 GitHub main 发布。步骤 07 发布后停止；步骤 08、09、10 未授权。

用户明确确认步骤 05 已完成当前阶段整改、Review 与验收，批准开始步骤 06，不要求再次审批或重做步骤 05 全量 Review/MZ 手工验收。最新受审功能候选为 `ad669a06218b6cf775f32b8333d75d9dd3f9186f`，文档 HEAD 为 `430d15ca6091e087caaf32516b28a5799c35e992`；独立复审 PASS 见 [原报告](../reviews/step-05-fix-round-1-independent-review.md)。获准先正常发布尚未合入 main 的已审步骤 04/05 成果，不夹带未审实现。

每步最新冻结候选独立 PASS、必要测试与 CI 通过后，Main 可记录 `APPROVED_BY_PREAUTHORIZED_ORCHESTRATOR` 并发布。这是用户预先委托的技术放行，不表示用户逐轮亲自审查。每步最多五轮正式 Review；P0/P1/阻断 P2 必须清零。

正式 Coding 使用项目角色 `step_coder`（gpt-6.1-sol/xhigh/default），Review 使用 `step_reviewer`（gpt-6.1-sol/ultra/default）。本轮不继承步骤 05 复审的 Fast 例外。仅使用有效配置满足要求的独立原生会话；不可见的服务端最终字段写 UNVERIFIED。

仅 Mock Provider、合成配置与冻结任务输入属于步骤 06。禁止真实视觉模型调用、Provider SDK/密钥、正式 Prompt Registry/Composer、模型路由、AI 工作流、收费/Redis/SaaS；不改批准 Profile、素材范围、全局 MZ/NW.js/RPGReactor 或其他项目数据。

原装 Host、旧 Map003 等延期事项保留原门禁。新增外围能力以回归与独立浏览器技术验收放行，不冒充每个新产物的 MZ 实测或用户美术确认。本记录追加授权，不改写历史 plans、批准记录、Review 或已发布 Manifest。

唯一当前状态入口：[steps-06-07-state.json](steps-06-07-state.json)。
