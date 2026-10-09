# Flappy Bugs

一只小甲虫，一声大大的噗。点击、触屏、Space 或 ArrowUp 放屁推进，穿过原创矢量花园。

**v0.2.1（2026-10-09）**。本轮整理傍晚蓝调、火焰与柱体接缝、星星尾迹、甲壳配色、解锁进度、音效和界面反馈，按 `dev → main` 交付。[GitHub Pages试玩](https://ljq61.github.io/FlappyBugs/) · [构建与部署记录](https://github.com/ljq61/FlappyBugs/actions/workflows/pages.yml) · [当前进度](docs/PROGRESS.md)。v0.1.1 曾被 CrazyGames Basic Launch 拒审；本轮 GitHub 交付不代表 CrazyGames 再次审核通过。

保留三颗心、0.95秒伤害保护、三类道具、5秒无敌及落底反弹和难度递增。移动障碍在4分后开始生成，第3/6/12组保底分别为星星、回血、毒物。普通飞行连续3次完美穿越触发2.8秒虚空冲刺；冲刺期间不积累新的充能，结束后从0/3重新积累。角色有蓝青轮廓与残影，普通星星道具保留独立防护表现。

傍晚蓝调花园包含七款植物柱体、柱身纹理、眨眼/鼓嘴/摆叶。燃烧藤蔓去掉尖刺并保留扭动火焰；十四份上下柱帽使用实心根座与柱身衔接。皮肤只改变甲壳及壳上配色，尾迹可选云朵、小星星和闪烁星尘，界面展示实际图案与解锁条件。结算区分本局分数、个人最佳和最高连击，并提供回主界面按钮；中英文标题和三种封面统一更新。当前54份原稿均为原创可编辑SVG，无旧照片、生成图或旧声音。

## 外观解锁

| 外观 | 条件（大于等于） |
| --- | --- |
| 花园甲壳 / 云朵尾迹 | 默认 |
| 晚霞甲壳 | 单局分数30 |
| 晴空甲壳 | 单局分数70 |
| 薄荷甲壳 | 累计过柱200组 |
| 蜂蜜甲壳 | 累计过柱1000组 |
| 薰衣草甲壳 | 最高完美连击20 |
| 星星尾迹 | 最高完美连击10 |
| 星尘尾迹 | 累计过柱500组 |

历史最高分用于单局目标；累计过柱按回合检查点增量保存并去重。旧档缺少累计量时以历史最高分迁移下限，无法还原旧版未记录的完整累计数。存档版本仍为v1；Sunshine原存档ID `sunny` 对应新的Star外观，按当前条件判断解锁。

## 运行

需要 Node `^20.19.0 || >=22.12.0`，依赖已通过 package-lock.json 锁定。

```sh
npm ci
npm run dev
```

默认地址 `http://127.0.0.1:5173/`。开发模式 `?debug=1` 显示碰撞框，`window.__FLAPPYBUGS_DEBUG__` 只提供只读状态；生产构建移除调试接口。侧边/HUD/按钮不触发推进，键盘长按不重复推进。

```sh
npm test
npm run build
npm run check:release
npm run preview
```

`dist/` 为独立站版本，仅加载随包提供的资源。`base: './'` 支持真实子目录托管，发布仅使用 dist 内容。

## GitHub 发布

开发进入 `dev`，自动执行测试、两种构建和资源审计；通过后合入 `main`，GitHub Actions 只把 `dist/` 发布到 Pages。版本来自 package.json，同时写入锁文件、页面元信息和桌面侧栏。

```sh
npm run package:standalone
```

历史v0.1.1 Release提供两种ZIP、清单、封面与QA证据；本轮0.2.1生成本地两包并同步dev/main，尚未新建Release。[发布步骤](docs/RELEASE.md) · [变更记录](CHANGELOG.md)。

## CrazyGames 预备包

```sh
npm run package:crazygames
```

生成 `dist-crazygames/` 与 `releases/flappybugs-0.2.1-crazygames.zip`，index.html 在ZIP根目录，附SHA-256清单。重复打包重建ZIP，不残留旧哈希资源。该构建显式载入官方v3 SDK，初始化失败显示重试；没有广告、账号或全球排行榜功能。提交时打开 **Progress Save**，游客和登录用户均使用SDK Data；SDK接受保存不等于已证明跨设备同步。存档记录最高分、最高连击、累计过柱和皮肤/尾迹选择，沿用v1成绩键。

三张PNG封面在 `releases/covers/`：1920×1080、800×1200、800×800；可编辑原稿在 `assets/art/covers/`，独立构图，宣传素材不进入游戏ZIP。预览视频留待正式发布阶段。

## 架构与协作

JavaScript + Three.js 正交2D + Vite；纯模型不依赖DOM、SDK或存储。1/120秒固定物理步；可见区域始终9:16，桌面用花园外壳填充两侧。纹理在加载时预热，窗口尺寸和DPR只影响显示。重新开始清理前局特效、音源与事件；标签页隐藏冻结模拟，回来主动继续。

- [实施规划与验收](docs/PLAN.md)
- [子agent分工与模型](docs/SUBAGENTS.md)：常规实现Sol high，QA Sol xhigh，检索Sol low，疑难升级Astra high；最多3个子agent并行。
- [素材来源与许可证](docs/ART-LICENSES.md)
- [平台接口与Portal验证步骤](docs/PLATFORM-QA.md)
- [当前及历史QA结果与未测项](docs/QA-REPORT.md)
- [审核整改清单与人工验收](docs/QUALITY-REWORK.md)
- [功能进度与发布状态](docs/PROGRESS.md)

v0.2.1通过71项Node测试、两种生产构建与发布审计、ZIP完整性/逐文件一致性检查；接缝专项另有7款上下GPU截图和独立QA。历史v0.1.1的26尺寸证据不自动成为本版通过结论。Edge、Safari、Android/iOS真机、手机声音听感、低端设备长期性能、CrazyGames Portal及审核仍待验证。Vite提示Three.js主块超过默认500kB警告线，完整包仍低于项目5MB预算。

原项目 flappyTest 仅用于只读规则参考。项目与新SVG按根目录 Apache-2.0 LICENSE；构建附项目及第三方许可。
