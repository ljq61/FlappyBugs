# FlappyBugs 项目协作指令

## 开发门禁（P0）

- implement / fix / refactor 任务写第一行产品代码前，读取 `~/.codex/rules/gates/dev-gate.md`，调用 `rule_search` 和 `vault_search`，并输出 Router 与 Rules/Vault pre-code 回执。
- 只有 HMIRP 强信号任务额外加载 HMIRP Stable 清洁约束；本项目是通用 Web 游戏。
- Rules 正文位于 Vault `Rules/`，PCG-AI 正文位于 `PCG AI Rule/`；经验使用 `vault_search`。
- 存在 `.codegraph/` 时优先 `codegraph_explore`，没有则使用普通检索；不自行建立索引。
- 每次写入后回读文件，核对内容、行数与换行密度。
- MR 审查不自行 Approve，不改 MR 描述，除非用户明确许可。

## 项目约束

- 先读 `docs/PLAN.md` 和 `docs/SUBAGENTS.md`，按当前用户授权阶段执行。
- `/Users/jackie/flappyTest` 作为只读参考；所有新实现与素材在本项目内。
- 不引入旧真人照片、改图、生成图或派生素材；美术交付真正可编辑 SVG 原稿。
- 不复制旧版本源码堆叠、聊天缓存或基于 Canvas 创建顺序的图片替换逻辑。
- 玩法模型不依赖 DOM/Three/SDK/storage；展示尺寸不改变9:16玩法视野。
- 验证区分 planned/executed/passed，以及自动测试、真实输入、真机、平台Preview和上线。
- 提交、推送、上传与发布由主 agent 根据用户授权处理，子 agent不执行。

## 子 agent 调度

- 对包含独立工作流的多模块实施任务，主 agent 在读门禁、完成规则/经验检索并冻结接口后，使用本项目 `core`、`art`、`platform`、`qa` 角色委派相应子任务。简单单文件任务由主 agent直接完成。
- 最多同时运行3个子 agent；不让子 agent再派生。角色定义在 `.codex/agents/*.toml`。
- 模型分级参考Ricochet-Rivals：主agent/core/art/platform为gpt-6.1-sol high；qa为gpt-6.1-sol xhigh；repo-scanner为gpt-6.1-sol low；escalation-engineer为gpt-6-astra high。
- repo-scanner用于窄范围只读定位；无需检索时不派发。escalation-engineer仅在两次定向修复失败、调查后仍有难定位跨模块问题、难复现时序问题或发布关键决策时调用；先提供已有证据，不常规调用Astra。
- 先并行玩法、美术与平台边界；主 agent接线和整合后安排QA。浏览器控制由主 agent协调独占。
- 严格遵守 `docs/SUBAGENTS.md` 的文件所有权，跨边界变更先协调；不覆盖/回滚他人的变更。
- 主 agent拥有main、render、UI、audio、i18n、package/lockfile、构建与最终发布；子 agent只能修改其分配目录。
- 若当前工具不支持指定自定义角色，主 agent先读取相应TOML的 `developer_instructions`、model和model_reasoning_effort，将完整角色约束、任务与必要证据注入提示，显式传入对应模型/推理设置；工具禁止完整历史fork时覆盖模型则使用独立上下文。不得把task_name相同当作角色配置已经自动加载。
- 交付包含实际改动、接口/接线点、C/AC/T、验证证据、失败/未测项；主 agent复核后判断整体完成。
