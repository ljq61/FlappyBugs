# FlappyBugs 子 agent 配置与使用

日期：2026-10-04。状态：项目配置已落盘；参考Ricochet-Rivals加入显式模型分级、检索和疑难升级角色；core/art/platform/qa已执行v0.1.0开发和验收，Astra按两次修复失败门槛参与首次输入问题定位。

首次试玩反馈批次（历史）：复用 art（Sol high）修改14份怪脸柱帽并交付5份动作/液体/柱身脸SVG；主 agent负责渲染接线、GPU像素检查和真实鼠标飞行。qa在本批额度中断，主 agent接手验证与最终报告；本批没有宣称独立QA完成，也没有更改角色模型设置。

柱身细节与动画追加批次：再次复用 art（Sol high）交7份透明平铺纹理和眼/嘴/叶3个动画层；主 agent负责纹理UV、眨眼/鼓嘴/叶摆、移动柱边界、暂停/reduce-motion及30次GPU几何体创建清理检查。保持原模型、数值与发布平台边界。

危险柱头追加批次：art（Sol high）重绘14份五刺帽冠，新增上下独立火焰层及危险类型元数据；主 agent接线尖端固定的帽冠伸缩、基底固定的火焰跳动，并检查全部7类型/28动态边界样本、暂停/reduce-motion、30次几何体清理及真实鼠标撞柱/星星/23分移动柱回归。模型数值、声音和平台边界保持原实现。

## 1. 运行方式

一个主 agent 负责接线、整合、试玩判断和最终交付。项目配置 `agents.max_concurrent_threads_per_session = 3`，限制同时打开的子 agent 线程，不含主线程；与当前会话主 agent + 3 个子 agent 的容量一致。按阶段复用槽位，不同时启动所有角色。

子 agent 用当前任务的子任务运行，共享 FlappyBugs 目录；不创建用户独立聊天，不向其他用户聊天发消息。模型与推理设置按下表固定；权限继承父 agent，repo-scanner额外配置只读。各角色配置 `[agents] enabled = false`，并在指令中禁止再次派生。

模型分级参考 `/Users/jackie/Ricochet-Rivals/.codex/config.toml` 与其角色文件的当前读取结果：

| 角色 | 模型 | 推理强度 | 参考与调整 |
| --- | --- | --- | --- |
| 主 agent | gpt-6.1-sol | high | 对齐Ricochet-Rivals主agent |
| core | gpt-6.1-sol | high | 对齐gameplay-engineer |
| art | gpt-6.1-sol | high | 新增本项目SVG制作职责，使用默认实现档 |
| platform | gpt-6.1-sol | high | 本项目处理SDK/存档；采用默认实现档，后续复杂问题走升级 |
| qa | gpt-6.1-sol | xhigh | 对齐test-reviewer的独立审查强度 |
| repo-scanner | gpt-6.1-sol | low | 对齐同名快速只读检索角色 |
| escalation-engineer | gpt-6-astra | high | 对齐同名疑难升级角色，按触发条件调用 |

参考项目的network-engineer为Sol xhigh，针对WebRTC/P2P复杂同步；FlappyBugs首发单人，没有新增该角色。六个角色按阶段选用，同时仍最多三个。主agent启动后的实时模型选择可覆盖项目默认值；当前聊天不声称因写配置已切换模型。

实际文件：

- [项目配置](../.codex/config.toml)：主模型、子agent默认模型、并发上限及六角色的 description/config_file 注册。
- [core](../.codex/agents/core.toml)、[art](../.codex/agents/art.toml)、[platform](../.codex/agents/platform.toml)、[qa](../.codex/agents/qa.toml)：独立角色指令和禁用再次派生。
- [repo-scanner](../.codex/agents/repo-scanner.toml)、[escalation-engineer](../.codex/agents/escalation-engineer.toml)：按需检索和疑难升级。
- [AGENTS.md](../AGENTS.md)：开发门禁、项目硬约束、按角色委派与文件边界。

注册相对路径以 `.codex/config.toml` 为基准，读取后解析为当前项目内的绝对路径。模型设置仅在项目内；用户级 `~/.codex/config.toml` 此前仅新增 `[projects."/Users/jackie/FlappyBugs"] trust_level = "trusted"`，本次不改用户配置。未信任的项目会跳过项目配置，因此这条登记是实际加载的前提。

配置方式依据 [OpenAI 官方子 agent 文档](https://learn.chatgpt.com/docs/agent-configuration/subagents) 与 [配置参考](https://learn.chatgpt.com/docs/config-file/config-reference)，并在本机 Codex CLI 0.160.0 验证。当前聊天的工具接口若没有自定义角色参数，主 agent先读取对应TOML，将完整 developer_instructions、任务与必要证据注入子任务，显式传入model与model_reasoning_effort；不支持完整历史fork同时覆盖模型时用独立上下文。相同task_name不证明已自动加载角色配置。新会话从项目目录读取配置，已有运行中的角色不会因文件变化自动获得新指令。

使用示例：`按 PLAN 开始 P0/P1，使用 core、art、platform 子 agent分工；整合后由qa验收。` 仅配置角色不会自动开始游戏实现。

## 2. 角色与文件所有权

| task_name | 角色 | 可写范围（拟建文件） | 输入/交付 |
| --- | --- | --- | --- |
| `core` | 玩法与时间步实现 | `src/game/config.js`、`src/game/model.js`、`tests/model.test.js` | 读 PLAN E2/E5/E8；交纯模型、稳定契约、固定步验证和回归记录 |
| `art` | SVG美术与资源元数据 | `assets/art/**`、`src/art/manifest.js`、`docs/ART-LICENSES.md` | 读 PLAN D2；先交样张，再完整素材、锚点/边界、来源台账 |
| `platform` | 平台与存档适配 | `src/platform/**`、`tests/platform.test.js`、`docs/PLATFORM-QA.md` | 读 PLAN D5及官方文档；交standalone/CG适配与可区分失败状态 |
| `qa` | 独立回归/包审计 | `scripts/check-release.mjs`、`docs/QA-REPORT.md`、`artifacts/qa/**` | 读完整验收；检查实现、浏览器/尺寸、包资源；报告可复现问题，不越界改实现 |
| `repo-scanner` | 快速证据检索 | 无可写范围，配置只读 | 定位实现/接口/依赖/测试入口，交路径和符号证据 |
| `escalation-engineer` | 疑难升级 | 默认只读；必要改动由主agent明确重分配文件所有权 | 接收已有尝试/日志/测试/假设，交根因与最小验证/修复方案 |
| 主 agent | 架构、接线、渲染/UI/声音、整合 | `src/main.js`、`src/render/**`、`src/ui/**`、`src/audio/**`、`src/i18n.js`、入口/依赖/构建、计划文档、发布文件 | 冻结契约、合并、运行最终检查、制作发布素材与交付 |

所有权是任务约束，不等同于文件系统沙箱。QA首次运行浏览器时由主 agent协调独占，避免多个 agent 控制同一浏览器标签页。art不改玩法，core不改贴图，platform不改入口，所有子agent不改package/lockfile；需要接线或依赖时报告给主 agent。

如果确有跨文件修改必要，先发消息给主 agent；主 agent调整所有权后再动手。共享目录中不重置/覆盖他人变更；不把“已写好文件”等同于整合完成。

## 3. 并行批次与依赖

```text
主 agent：读门禁/检索 → 确定模型、资源、平台接口
                   ↓
批次 A（最多3子agent）：core + art + platform
                   ↓
主 agent：唯一入口接线 → P0样张纵向切片 → 真实试玩
                   ↓
批次 B：art补全 + platform真实SDK验证（core按需修复）
                   ↓
主 agent：UI/声音/尺寸/发布构建稳定
                   ↓
批次 C：qa独立验收；原作者按问题修复
                   ↓
主 agent：复测受影响项 → ZIP/封面/视频 → 发布阶段交付
```

core可在SVG完成前以纯模型工作；art依赖冻结的玩法视野与资源ID；platform依赖main消费的语义状态契约，不依赖正式美术。QA正式结论必须指向整合后的同一构建，不能混用多个阶段的产物。

需要定位实现时先短任务调用repo-scanner，再将证据交给实现角色。疑难升级仅在两次定向修复失败、调查后根因仍不明且跨模块、运行结果与静态分析矛盾、难复现时序问题或发布关键架构决策时触发；先整理目标、实况、尝试、测试和未决假设，避免Astra重做已确认的调查。

## 4. 每个任务共同注入的硬约束

下面内容用于主 agent补充阶段与检索账本；角色自身的职责与文件约束已存入TOML。当前工具不支持指定角色时，一并注入对应TOML中的完整 developer_instructions：

```text
工作目录：/Users/jackie/FlappyBugs。
源码参考：/Users/jackie/flappyTest，只读；不得改动或复制照片/生成图/聊天缓存。
目标与验收：先读 docs/PLAN.md 和 docs/SUBAGENTS.md。
遵守用户 AGENTS：写产品代码前读取 ~/.codex/rules/gates/dev-gate.md。
主agent检索账本：通用Web游戏换皮/发布，rule_search no hit，vault_search no relevant hit。
收到具体任务后核对覆盖范围；新增模块/API/SDK/平台假设需补查 rule_search 与 vault_search，
输出 Router 与 pre-code 回执后再写源码。当前任务没有HMIRP信号。
有.codegraph索引时优先codegraph_explore，没有则普通检索；不自行建索引。
只写你的分配目录；不改入口/package/lockfile，不回滚他人改动。
素材为原创可编辑SVG，不内嵌旧照片或位图；不要生成“看起来像矢量”的栅格图代替SVG。
实现最少所需代码，不加未请求的框架、后端、商店或养成系统。
不再派生子agent，不创建用户聊天，不提交Git、上传或发布。
写后回读文件，确认排版/行数正常；运行与自身改动有关的检查。
交付必须列实际改动、契约、验证证据、失败/未测项与主agent接线点。
```

## 5. 各角色任务提示骨架

### core

依据 PLAN C2、AC2/AC3，实现纯模型。明确输入是一次语义flap，不使用DOM/Three/SDK。保留3HP、0.95s保护、20分后新障碍移动、5s无敌、落底反弹、计分和5/10/15保底的语义。提供createGame/start/flap/step/reset/getSnapshot/drainEvents；使用可注入随机源，测试刷新率调度和reset。将必要接线说明交给主agent，不自行改main。

### art

依据 PLAN C3/D2，先交甲虫推进样张、一个上下障碍、三道具，之后扩展到全套。提交真正SVG原稿、分层/锚点/可见轮廓、统一颜色和source台账。禁止嵌入任何照片/旧图/base64位图，不用原障碍拉伸法。以小屏清楚可读和碰撞可解释为准。资源清单使用稳定ID，资源路径须适配构建，不依赖Canvas创建序号。

### platform

依据 PLAN C6/D5，核对官方v3文档，实现standalone和CrazyGames适配。SDK对象只在平台边界，初始化错误可区分；生命周期恰好一次；平台muteAudio优先；成绩读后写、防旧数据覆盖；standalone存储拒绝可继续，平台保存失败不可声称云同步完成。提供stub测试和Portal QA步骤；不加入广告实现，不替主agent发平台事件或修改入口。

### qa

依据 PLAN AC1–AC8，针对主agent给定的同一整合构建执行独立检查。先包/资源/路径审计，再真实浏览器输入、多尺寸和声音生命周期；有设备才标真机passed。记录精确复现与截图、设备/网络/构建标识；未测项pending。只写报告/验证脚本，不自行修产品代码；把失败交回相应文件所有者。

## 6. 交付格式与复核

每个 agent结束时交付：

1. 改动文件和新增/修改符号；是否严格在所有权范围内。
2. 输入/输出契约与main所需接线；资源agent附ID/尺寸/锚点/来源。
3. 实际执行的命令或人工步骤、结果与证据；计划但未执行的验证明确区分。
4. 对应C/AC/T与当前未完成项；不以局部stub通过代替浏览器或平台通过。
5. 已知风险、失败回查点、请求主agent处理的跨边界事项。

主agent复核：读改动 → 对照冻结契约 → 接线 → 必要验证 → 核销追踪表。子agent回复“完成”不自动代表整体完成；主agent负责最终构建与交付状态。

## 7. 配置验证记录

2026-10-04，Codex CLI 0.160.0：

- 本次调整后的七份TOML已通过语法、模型档位与角色注册复核，角色name与文件名一致，必需字段齐全。
- 临时app-server以 `--strict-config` 启动，只调用 initialize 与 config/read，没有调用模型或启动agent任务，验证后关闭。
- FlappyBugs项目配置层 disabledReason 为 null，实际加载成功。
- 有效agents.enabled=true，并发上限=3；主模型与子agent默认配置为Sol high；六个角色的config_file解析至本项目相应TOML。
- 角色文件均禁用子agent工具，各角色显式模型/推理设置对应上表；本机模型目录确认所选模型支持对应推理档位。配置验证阶段未调用模型；后续实际开发调度见第8节，游戏验证见QA报告。

## 8. 实施调度记录

2026-10-04：主agent先完成门禁、规则/经验检索和快照/资源/平台接口冻结，再以独立上下文显式传入配置的模型与推理档位。core、art、platform（Sol high）并行完成三个互不覆盖的文件边界；主agent整合后由qa（Sol xhigh）做独立审查与发布审计。首次手势207ms音频创建与旧RAF时间戳的时序问题，在两次定向修复未消除后委派escalation-engineer（Astra high）只读调查；主agent实施并验证其建议。没有派发无必要的repo-scanner，也没有子agent继续派生、创建用户聊天、提交Git或发布。

最终接线以src/main.js为准；实际验证与未完成项见QA-REPORT.md。

2026-10-04 v0.1.1发布批次：art只读复核44份SVG/41条资源与模型档位；主agent更新版本、最终文档和CI，执行构建/浏览器/线上检查，推送dev、合入main并发布。qa额度中断状态未被记为本次独立验收。
