# FlappyBugs 甲虫矢量换皮与 CrazyGames 发布规划

- 模式：完整规划
- Feature：`beetle-vector-reskin`
- 日期：2026-10-04
- 状态：v0.1.1 GitHub发布批次；生产构建及本地SDK验证；CrazyGames真机/Portal/审核待验证
- 一句话：保留 flappyTest 的飞翔闯关规则，用小甲虫放屁推进与原创花园矢量美术建立独立 Web 游戏，并准备 CrazyGames 发布包。

## 1. 任务契约

目标：在 `/Users/jackie/FlappyBugs` 开发独立版本；`/Users/jackie/flappyTest` 作为只读玩法参考。

用户硬约束：小甲虫飞翔、放屁跳跃；之前真人照片、照片改图和生成图全部退出新项目；美术改为绘制的矢量风格；考虑架构、发布尺寸及子 agent 配置。

初始规划轮完成条件：形成代码证据、设计决策、文件边界、实施阶段、验收和发布尺寸的规划。用户随后于2026-10-04授权开始开发并提供GitHub仓库；当前交付为v0.1.1、浏览器与资源验证、CrazyGames预备ZIP和三种封面。用户进一步授权更新文档/版本、推送dev、合入main并发布GitHub Pages/Release；CrazyGames真机、Portal Preview、审核与上线单独验收。

首发范围：单人无限挑战、三颗心、三类道具、移动障碍、最好成绩、声音开关、英文默认文案和中文文案。暂不加入后端、多人、商店、养成、任务系统或全球排行榜。

工作名建议：`Flappy Bugs`；中文暂用“屁屁甲虫”。名称与配色是可调整设计参数，正式名称在封面制作前确定，不以工作名已获平台审核为前提。

## 2. 当前行为与证据

以下均由 2026-10-04 本地文件读取确认；未运行原游戏，历史试玩结果不作为此次验收。

| ID | 当前证据 | 对新项目的影响 |
| --- | --- | --- |
| E1 | `flappyTest/index.html:55` 载入 `src/bootstrap-v9.js`；bootstrap 最终导入 `game-v8.js` | 新项目使用一个正式入口，不继承 v2–v9 的版本堆叠 |
| E2 | `src/game-v8.js:1–10`：Three.js CDN 导入；9×16 世界；GRAV=-15.2，JUMP=5.72，3 HP；MOVE_SCORE=20；STAR_SECONDS=5 | 保留玩法数值基线；Three.js 在新构建中本地打包；尺寸不改变物理 |
| E3 | `src/bootstrap-v9.js:109–140` 临时替换全局 `HTMLCanvasElement.prototype.getContext`，按 420×1500 Canvas 创建序号覆盖图片 | 改成显式资源 ID/清单；不复制此替换机制 |
| E4 | `src/hero-data.js` 内嵌 WebP；`assets/` 有手势、四类人物柱、火箭/厕所按钮 | 新目录不复制这些文件、内嵌数据或旧图派生素材 |
| E5 | `game-v8.js:468–562`：计分、难度、三类道具、伤害保护、5秒无敌、落底反弹、移动障碍、reset | 提取纯玩法模型，以这些语义作为回归基线 |
| E6 | `game-v8.js:258–370`：外部 MP3、合成 BGM、短窗口调度、无敌音乐切换；`end()` 延迟播放旧失败笑声；本轮未听取音频内容 | 保留音频调度思路；新做音效与旋律，取消旧受伤声/嘲笑声依赖 |
| E7 | `game-v8.js` 的初始best读取与 `end()` 直接使用 `flappyTestBest`；`styles.css:6` 的 9:16 容器设 min-width:280px | 独立存档键、容错存储；小横屏中移除导致溢出的最小宽度 |
| E8 | 循环 `Math.min(clock.getDelta(),1/30)`，旋转每帧固定插值，拾取物每帧叠加漂移 | 固定步长物理；动画与帧率脱钩；悬浮道具使用基准位置计算 |
| E9 | 无 package.json 或现有自动测试入口；Pages workflow 上传仓库根目录 | 建可重复构建和测试入口，仅发布 dist，不把历史代码和聊天缓存带进包 |
| E10 | FlappyBugs 是空目录；flappyTest 无 `.codegraph/`，因此按规则使用普通检索；当前 HEAD 为 `798f721` | 新项目按当前读取的逻辑迁移；不从旧记忆推定版本或远端状态 |

主链路：HTML DOM → 图片预加载/Canvas 覆盖 → Three.js 纹理/精灵 → pointer/keyboard → start/reset/flap → update/碰撞/道具 → end/本地成绩 → DOM 结算。

开发门禁记录：已读取 `~/.codex/rules/gates/dev-gate.md`；rule_search 与 vault_search 对通用 Web 游戏换皮/发布任务均未发现相关命中。Vault 索引时间为 2026-08-08，仅代表已索引范围。正式写产品代码前重新检索新增实现关键词，输出 Router 与 pre-code 回执；不加载无关 HMIRP 规则。

## 3. 玩法与美术决策

### D1：先保留规则，再通过试玩调节手感

每次点击/触屏/Space/ArrowUp：设置一次向上速度，腹部挤压、鞘翅张开、喷出短促气团、触发滑稽“噗”声。翅膀负责视觉飞翔，点击推进仍是一种操作，不增加第二种输入或能量条。

初版沿用：3 HP；碰撞后 0.95 秒保护；20 分后新生成的障碍上下移动；5 秒无敌及落底反弹；穿过一组障碍得 1 分；最好成绩；逐步加速与缩小缝隙；原 5/10/15 组道具保底。保底阈值是源代码的调度基线，不承诺在一局不足阈值时出现道具。

补血/扣血/无敌映射为露珠果、霉菌团、金色花粉。明确形状区分：补血圆润、有“+”；扣血尖刺、有“×”；无敌星形、有光环。补血不超过 3，无敌不叠加为永久效果，重复获得重置为 5 秒。满血收集仍有反馈。

不自动改变原玩法平衡；如试玩表明毒物保底或多种障碍妨碍理解，另记为可衡量的调优决策。首局使用叶片起飞平台和一句 “Tap to toot & fly”；第一次有效输入立即进入玩法。死亡展示本次分数/最好成绩，一次点击重试。

### D2：原创、可编辑的真正矢量原稿

风格：圆润卡通甲虫，深紫统一描边，扁平色块和少量高光；绿色花园、奶油天空、粉黄花朵；前景障碍对比清楚，背景叶片降低饱和度与细节。放屁呈浅绿/淡黄气团，不画排泄物。受伤用星星与震动替代红色血滴；结算改成甲虫晕眩表情。

甲虫辨识要点：头胸腹分段、两根触角、六足、左右鞘翅与透明后翅；小尺寸保留明确剪影。首批姿态：待机、推进、下落、受伤、无敌、失败。可用身体/翅膀/眼睛分层动画，避免为每帧制作大图。

| 旧内容 | 新内容 | 保留的语义 |
| --- | --- | --- |
| 照片主角 / base64 WebP | 原创分层甲虫 SVG | 原位置、碰撞与推进 |
| 手势与四个人物柱、铅笔、美工刀 | 7 个花园障碍外观：嫩芽、芦苇、蕨叶、蘑菇、花苞、藤蔓、荆棘 | 同类通道碰撞边界，不引入新攻击行为 |
| 悬崖、厕所起点 | 树叶平台与草丛 | 起飞短场景与退出动画 |
| 铜锣烧、毒瓶、星星 | 露珠果、霉菌团、金色花粉 | 补血、扣血、5秒无敌 |
| 火箭/厕所图标、恐怖眼睛、红血粒子 | 甲虫起飞/重试图标、晕眩表情、卡通星点 | 操作入口、结算、受伤反馈 |
| 真人受伤声、笑声、外部来源不明 MP3 | 新绘声/合成音效、原创短旋律 | 推进、受伤、失败、音乐模式切换 |

SVG 使用路径、形状与简单渐变；禁用嵌入 PNG/WebP/base64、外链图片、script、foreignObject 和远程字体。逐份记录作者/制作方式/许可证。字体优先系统字体；若加入字体文件，须有分发许可。

建议原稿规格（项目约定，不是平台要求）：甲虫 viewBox 0 0 256 256；道具 128×128；UI 图标 64×64；背景按 720×1280 构图；障碍拆“端部+重复茎干”，由元数据提供锚点与可见边界。上、下障碍分别提供方向，避免把整朵花倒挂。纹理缓存按展示尺寸/DPR 栅格化，避免每帧重新解析 SVG；始终交付 SVG 原文件。运行时纹理或封面导出图不属于重新引入旧图片。

## 4. 架构方案与责任边界

### D3：JavaScript + Three.js 正交 2D + Vite

保留已经使用的渲染方式，集中改资源、耦合点与生命周期。首发不迁移至 Unity/Phaser/Pixi，也不引入 React；当前玩法不需要这些新增框架。Three.js 使用验证可安装的版本并锁定依赖，打入产物，取消 jsDelivr 运行依赖。Vite 使用 `base: './'`，支持平台托管和子路径部署。[Vite 构建文档](https://vite.dev/guide/build.html)

```text
index.html → main.js（唯一接线入口）
                  ├─ game/model.js ← config.js
                  ├─ render/scene.js ← art/manifest.js + SVG
                  ├─ ui/shell.js + ui/styles.css ← i18n.js
                  ├─ audio/audio.js
                  └─ platform/index.js → standalone.js / crazygames.js
```

这是目标文件表，文件随对应阶段建立，不先生成空模块。

| 拟建位置 | 输入/输出与所有权 |
| --- | --- |
| `src/main.js` | 初始化平台与资源、创建 model/view、绑定一次输入、驱动时间循环与状态接线；主 agent 维护 |
| `src/game/config.js`、`model.js` | 配置+输入+固定 dt → 纯状态快照+事件；控制物理、生成、碰撞、分数、HP、无敌、reset；不访问 DOM/Three/SDK/storage |
| `src/render/scene.js` | 状态快照+素材 ID → 精灵/动画；纹理缓存、resize、dispose、可选碰撞调试；不决定伤害 |
| `src/art/manifest.js`、`assets/art/*.svg` | ID → SVG 资源、比例、锚点、可见轮廓与碰撞参数；禁止 Canvas 创建顺序契约 |
| `src/ui/shell.js`、`styles.css`、`i18n.js` | HUD、教程、结算、声音开关、英文与中文；返回语义动作，不直接改 model |
| `src/audio/audio.js` | 玩法事件 → BGM/SFX；总线静音、暂停、恢复、dispose；使用短窗口调度，统一控制全部声音 |
| `src/platform/*.js` | 平台初始化、gameplay 生命周期、设置、成绩读写；SDK 对象只存在于此边界 |
| `tests/model.test.js`、`tests/platform.test.js`、`scripts/check-release.mjs` | 纯逻辑/平台适配的最小自动验证；发布包资源和路径检查 |
| `package.json`、lockfile、`vite.config.js` | 可重复 dev/build/preview/test/check:release；只由主 agent 修改依赖与入口 |

模型契约先固定：`createGame(config, random)`、`start()`、`flap()`、`step(dt)`、`reset()`、`getSnapshot()`、`drainEvents()`。随机源可注入，用同一输入验证刷新率差异；测试不另写一套物理。事件是分数变化、伤害、拾取、无敌模式、开始和结束，renderer/audio/ui 只能消费。

时间：物理 1/120 秒固定步长，60/120/144/165Hz 都消耗同一模拟步。单帧最多 12 次；遇到长停顿暂停并清掉累积时间，不快进造成死亡。恢复显示继续提示，用户输入恢复；第一下恢复不同时触发多次推进。动画按秒计；浏览器自动重复 keydown 不重复推进。

状态：loading → ready → playing → gameover；显式 pause 保存 previousState；resume 回到原状态。一次输入只归一个动作；按钮事件不冒泡为第二次推进。HUD/侧边交互区不触发飞翔。

视野与碰撞：逻辑永远 9×16；改变窗口只改显示尺度。以甲虫身体为碰撞体，翅膀/触角/气团为装饰；新外形必须通过调试轮廓与真实点击试玩校准，不能机械继承旧 HITW/HITH 后宣称准确。障碍可见端部需贴合通道边界，装饰叶片明确在可碰撞范围内或退至背景。

延迟任务：新一局递增 runId，上一局失败声/动画回调必须取消或检查 runId；reset 清掉无敌、粒子、计分标记及道具保底；dispose 清理监听、计时器、音源和 GPU 资源。

## 5. 展示尺寸、体积与发布素材

### D4：固定玩法视野 + 自适应外壳

建议设计参考为 720×1280（9:16）；这不是要求手机实际绘制这么多像素。桌面 16:9 iframe：中央保留 9:16 游戏区域，两侧使用原创花园背景；竖屏手机以可用高度/宽度等比适配，避开安全区。横向扩屏不增加提前看到障碍的距离。

先扣 safe-area，再计算 `scale=min(availableWidth/9, availableHeight/16)`。支持 ResizeObserver、容器 resize、移动浏览器地址栏变化与旋转；使用动态视口高度和回退。取消旧 280px 最小宽度。DPR 上限建议 2，低性能设备降到 1；绘制分辨率与逻辑尺寸分离。

| 用途 | 尺寸 | 验收重点 |
| --- | --- | --- |
| 项目构图参考 | 720×1280 | 完整角色与通道，UI不盖判定区 |
| 手机竖屏测试 | 360×640、390×844、430×932 CSS px | safe-area、声音按钮、一次触控一次动作 |
| 平台最小主要桌面 iframe | 821×462 | 中央约260×462，紧凑 HUD 与英文可读、无溢出 |
| 其他平台桌面 iframe | 907×510、1077×606、1216×684 | 比例、文字、按钮、无横向滚动 |
| 桌面全屏 | 1280×720、1366×768、1536×864、1920×1080 | 视野公平、清晰、无新增玩法可见范围 |
| 平台横屏移动/平板测试 | 800×450、1080×607 | 小尺寸英文与按钮可用；设备实测后决定支持方向 |
| 平台图片封面（必备三张） | 1920×1080、800×1200、800×800 | 分别构图，同一甲虫/颜色/标题；不是拉伸裁切 |

平台测试尺寸来自 [Gameplay requirements](https://docs.crazygames.com/requirements/gameplay/)。英文必需；DPR=1 也要可读；各刷新率物理一致；平台提供全屏，新游戏不制作自定义全屏按钮。竖屏作品允许以侧边背景在桌面呈现。[Technical requirements](https://docs.crazygames.com/requirements/technical/)

UI 项目目标：紧凑模式保留分数/HP，最好成绩移至结算或侧边；关键文字实际 CSS 字号≥14px，主要点击区域≥44×44px，甲虫清楚可辨。这些是内部设计指标，仍以各尺寸真实预览为最终依据。

平台限制：初始下载≤50MB；移动首页资格初始下载≤20MB；总文件≤250MB、≤1500文件；不接 SDK 时总包≤50MB，移动首页资格总包≤20MB；游戏包内文件引用用相对路径。[Technical requirements](https://docs.crazygames.com/requirements/technical/)

本项目更紧的预算：首次可玩下载≤5MB、完整 ZIP≤10MB、文件≤100；以实际构建统计为准，超预算先查未使用资源/音频/依赖，不修改玩法降低内容可理解性。仅 SDK 保留官方远程脚本例外，游戏和字体/素材均随包提供。

宣传另交：横版和竖版预览视频，官方要求 1080p、16:9/2:3、15–20秒、≤50MB、无声音，静态封面作为开场。视频尺寸以 Developer Portal 的实际校验再次确认；封面文字仅游戏标题，不加“Play Now”、商店标志或边框。宣传文件不塞进游戏 ZIP。[Game covers](https://docs.crazygames.com/requirements/game-covers/)

## 6. CrazyGames 平台接线与发布路线

### D5：先准备 Basic Launch，SDK 边界从初版预留

Basic Launch 的 SDK 可选、无变现；Full Launch 要求 SDK 集成。首发建议接 v3 初始化和 gameplay start/stop，便于后续升级；不以接入 SDK 等同于获准上架或变现。[Requirements introduction](https://docs.crazygames.com/requirements/intro/)

standalone 适配器支持 localhost/独立静态站点。CrazyGames 适配器等待初始化，使用官方 v3 SDK；初始化异常可读、可重试，平台 QA 将此视为失败，不用静默空实现掩盖。平台未初始化前不读写 SDK 数据。资源加载失败提供重试，不能只留空白画布。

gameplayStart：有效进入玩法/显式恢复/未来复活时；gameplayStop：结算、显式暂停、菜单等真实玩法间断；每次状态变化只触发一次。失焦或离开区域由平台处理，不仅因为 visibilitychange 就发 stop/start；本地模拟可以为了公平冻结，页面回来后的继续动作按实际状态接线，避免重复事件。[Game SDK](https://docs.crazygames.com/sdk/game/)

统一声音开关控制 BGM、合成音、所有 Audio/BufferSource 回退路径；SDK `muteAudio=true` 优先级最高，用户开关不能覆盖平台静音；响应设置变更。音频首次有效手势解锁；暂停时停止待播放节点，恢复重新调度，防止旧音效突然补播。[Game SDK](https://docs.crazygames.com/sdk/game/)

成绩键建议 `flappybugs:v1:best`，settings 用独立键；不自动迁移 flappyTest 分数。standalone 的 localStorage 被拒绝时用内存继续游戏。CrazyGames 若采用 Data 模块，登录用户和游客均只走 Data 模块，并在提交设置选择 Progress Save；读已有数据后再写，保留更高 best。平台数据失败不得伪装成已云同步。[Data SDK](https://docs.crazygames.com/sdk/data/)

广告只在 Full Launch 后单独实现、遵守 SDK 生命周期；如需要复活广告，再补充需求/规则检索和广告成功、无库存、失败、取消的验证。首版不加入广告按钮、第三方广告或主动外跳链接。

发布链：`npm ci → npm test → npm run build → npm run check:release → 本地 HTTP 预览/iframe → 真机 → Developer Portal Preview/QA → 打包 dist 内容 → 准备英文介绍、操作、方向与封面视频 → 提交审核`。

ZIP 根目录必须直接有 `index.html`；仅 dist 内容进入包，排除源码历史、照片、缓存、配置与开发日志。Preview 能通过不代表审核通过；上传成功、Basic Launch上线、Full Launch邀请、变现开启分别报告，不能混称“发布成功”。提交时再次检查官方规格，不在本轮登录或提交。

## 7. 改动、实施阶段与追踪

| 改动 | 证据/决策 | 实施目标与责任 | 验收/验证 |
| --- | --- | --- | --- |
| C1 新建独立构建 | E1/E9/E10/D3 | P1 主 agent：入口、依赖锁定、相对路径、dist发布 | AC1/T1 |
| C2 纯模型与时间循环 | E2/E5/E8/D1/D3 | P1 core agent：迁移规则；主 agent 接线 | AC2/AC3/T2/T3 |
| C3 SVG与显式资源 | E3/E4/D2 | P0 art agent 样张；P2 完整素材；主 agent renderer | AC4/T4 |
| C4 UI/尺寸/英文 | E7/D4 | P2 主 agent：shell、缩放、响应布局、i18n | AC5/T5 |
| C5 合成音频 | E6/D2/D3 | P2 主 agent：总线、原创旋律、生命周期 | AC6/T6 |
| C6 平台适配/存档 | E7/D5 | P1 platform agent 占位实现；P3 SDK/data接线 | AC7/T7 |
| C7 发布包与素材 | E9/D4/D5 | P3 QA agent核验；P4 主 agent制作交付清单 | AC8/T8 |

P0：主 agent 冻结玩法/资源/平台契约；art 交甲虫推进姿态、一个上下障碍、三道具与小屏构图。先看样张是否可读、放屁反馈是否明确，再扩展全套。

P1：主 agent 建最小构建与正式入口；core 迁移纯模型；platform 建独立/平台适配边界；接线成“点击→甲虫推进→一个障碍→伤害/计分→结算重试”的可玩切片。先用 P0 原创样张，绝不用旧照片占位。

P2：在切片上补全 7 种外观、三道具、无敌、移动障碍、声音、英文/中文与多尺寸 UI。逐项核销源游戏语义，换皮不顺带扩大系统。

P3：接实际 SDK 和适当数据模块，执行浏览器/真机/平台 Preview 与包审计。QA 在实现稳定后独立检查；失败回到对应契约与模块，由原文件所有者修复。

P4：定正式名称、制作三封面/两预览视频、英文提交说明与ZIP；上传和审核作为后续用户授权的发布阶段。当前尚未承诺 CrazyGames 审核结果。

## 8. 验收与验证计划

以下为验收标准；实施后实际执行、结果、构建标识与未测项统一记录于 [QA-REPORT.md](QA-REPORT.md)。Node测试、两种构建、发布审计和Chrome验证已建立；设备、Portal与上线项不得由本地通过替代。

| ID | 场景、通过条件与失败定位 |
| --- | --- |
| AC1 / T1 | `npm ci && npm run build` 后 dist 可从根路径和嵌套路径 HTTP 启动；无游戏 CDN请求/404；回查 Vite/manifest/main |
| AC2 / T2 | `node --test tests/model.test.js`：同随机种子与定时输入，模拟60/120/144/165Hz；同一模拟时刻位置/速度差≤1e-6，分数/HP/道具结果相同；回查 accumulator/step/input量化 |
| AC3 / T3 | 纯模型测满血补血、保护期只扣一次、无敌保护与5秒到期、无敌落底反弹、20分前后新障碍移动、同组计分一次、道具保底、重启全状态重置；reset后上一局延迟回调不能污染；回查model及main的runId |
| AC4 / T4 | SVG源检查无嵌入栅格/外链/script；dist清单无旧人物/照片/hero-data；人工看角色/道具/7类障碍与debug碰撞边界，记录截图；回查 art/manifest/renderer |
| AC5 / T5 | 实际 iframe 遍历第5节尺寸，DPR1/2；英文可读，无裁切/溢出；Space/Up/鼠标/触控分别真实操作一次只推进一次；静音点击不推进；resize不改变逻辑视野；回查UI/input/resize |
| AC6 / T6 | 首次手势解锁、快速重试10次、静音、平台强制静音、失焦/恢复；无旧真人音效、无失败声串到新局、无恢复爆音；回查总线/runId/调度器 |
| AC7 / T7 | `node --test tests/platform.test.js` 用SDK stub测试初始化失败、生命周期恰好一次、muteAudio优先与更新、读后写best、保存失败/存储拒绝；再在Portal Preview核对真实SDK行为和存档；stub通过不代替平台证明 |
| AC8 / T8 | `npm run check:release` 统计初始资源/ZIP/文件数、index根路径、旧资源和依赖；Chrome/Edge/Safari、Android Chrome/iOS Safari试玩与Portal QA；目标低端设备60FPS、持续10分钟和30次重试资源数量不持续增长；记录设备/网络/尺寸/帧率，未实测项保持pending |

人工证据格式：版本/构建标识、浏览器与设备、尺寸/DPR、输入步骤、截图或录屏、网络/console错误、预期与实际。性能未达标先减少粒子/纹理/DPR，再审视渲染器；迁移 Canvas2D 只有在性能证据支持时另立决策。

## 9. 风险、回退与可观测性

- R1 风格变成“照片转插画”或假 SVG：扫描引用与 `<image>`，检查原稿；拒绝旧图与嵌入位图进入新目录（C3/T4）。
- R2 甲虫剪影/叶片导致误判：使用可见边界、debug轮廓和实操；先更改视觉锚点，再有证据地调碰撞（C2/C3/T3/T4）。
- R3 固定步迁移改变手感：保留原参数，记录推进高度/到顶时间；切片阶段试玩确认，再扩大素材（C2/T2/T3）。
- R4 小横屏中心过窄：采用紧凑HUD和侧边展示；以821×462/DPR1验收，禁止靠拉伸角色解决（C4/T5）。
- R5 SDK/音频/成绩错误被忽略：适配器返回可区分状态，控制台保留错误；Portal QA失败明确标记，发布不隐藏失败（C5/C6/T6/T7）。
- R6 单纯换皮缺少辨识度：先用完整推进动作、花园主题与封面建立甲虫特征；能否获选要由平台审核与真实用户表现判断（C3/C7/T4/T8）。

每个阶段保留可运行快照；回退只影响 FlappyBugs，不依赖复制旧人物资源救场。开发调试仅提供种子、状态/碰撞显示和本地性能数据；不加入第三方分析服务或未经请求的用户数据收集。

## 10. 设计参数与未知项

可直接按推荐值启动下一阶段：工作名、圆润花园色调、3HP旧规则、9:16公平视野、Three.js/Vite、SVG美术、首发Basic路线；这些不是声称用户逐项确认的最终设计。

正式发布前必须补齐：正式名称、素材来源台账、依赖安装与实际构建、设备/网络证据、Portal QA、账号中的提交设置、最新平台规格。所有仍未发生的外部审核与上线状态均为 unknown。

子 agent 的角色与可直接使用的任务约束见 [SUBAGENTS.md](SUBAGENTS.md)。2026-10-04 后续配置阶段已创建 `.codex/config.toml`、六份角色TOML与项目AGENTS.md，并通过严格config/read验证；用户随后授权开发，core/art/platform/qa已实际执行，首次输入时序问题按升级门槛交由Astra参与定位。

## 11. 完成后范围审计

- 每项代码/素材 diff 对应 C1–C7，未规划新增系统须先更新决策。
- AC1–AC8 逐项附证据；区分自动测试、真实输入、真机、平台Preview、审核与上线。
- 新项目源码、dist、ZIP三层检查旧资源，不能只检查页面可见结果。
- package/lockfile/入口仅主 agent整合；子 agent交付无跨所有权改动。
- ZIP、素材、介绍与未完成项一并交付；网页可打开不代表发布审核完成。

## 12. 修订记录

- 2026-10-04：基于 flappyTest 当前源码和 CrazyGames 官方文档建立第一版规划；未修改源游戏，未运行新游戏测试。
- 2026-10-04：落实项目Codex子agent配置与项目信任登记；四角色/并发上限读取验证通过，游戏实施阶段不变。
- 2026-10-04：参考Ricochet-Rivals当前配置加入显式模型分级、repo-scanner和escalation-engineer；保持3个并发子agent和原游戏实施范围。

- 2026-10-04 实施：Vite8.3.2/Three0.186.1，纯模型与独立平台边界；SVG身体碰撞宽由旧人物0.6校准为0.98、高0.78。固定步时钟在手势开始/恢复使用performance.now基线，忽略旧RAF时间戳；绘制统一透明队列，避免背景遮住茎干。该初始开发批次仅关联main及Apache许可证；后续GitHub发布见下条。实际结果见QA报告，视频/真机/Portal/上线保留待办。

- 2026-10-04 GitHub发布批次：版本0.1.0→0.1.1，危险柱头/独立火焰、柱身动画、甲虫动作/虫汁/彩虹汇入dev；新增main构建发布Pages流程、两种ZIP与发布步骤。GitHub发布与CrazyGames审核分别记录，详见RELEASE.md和QA-REPORT.md。
