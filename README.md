# Flappy Bugs

一只小甲虫，一声大大的噗。点击、触屏、Space 或 ArrowUp 放屁推进，穿过原创矢量花园。

**v0.1.1，2026-10-04。** [在线试玩](https://ljq61.github.io/FlappyBugs/) · [GitHub Release / 下载](https://github.com/ljq61/FlappyBugs/releases/tag/v0.1.1) · [构建与发布状态](https://github.com/ljq61/FlappyBugs/actions/workflows/pages.yml)。CrazyGames 预备包已制作，尚未上传、提交审核或上线。

保留 flappyTest 的三颗心、0.95秒伤害保护、三类道具、5秒无敌及落底反弹、20分后新障碍移动、5/10/15组道具保底和难度递增。加入危险植物柱头（荆棘藤蔓、密集尖刺、锯齿叶、毒针、刺籽荚与独立跳动火焰）、柱身七种平铺纹理/怪脸眨眼/鼓嘴/叶片摆动、甲虫上跳挤压/腾空拉伸/下落俯冲与独立表情、撞柱黄绿虫汁、全身及翅膀流动彩虹、喷气动作、合成音效/旋律、暂停恢复、英文/中文、独立存档。全部44份原稿为可编辑SVG，没有复制旧照片、旧生成图或旧声音。

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

Release 提供独立站ZIP、CrazyGames预备ZIP、对应SHA-256清单、三种封面与QA证据。[发布步骤](docs/RELEASE.md) · [变更记录](CHANGELOG.md)。

## CrazyGames 预备包

```sh
npm run package:crazygames
```

生成 `dist-crazygames/` 与 `releases/flappybugs-0.1.1-crazygames.zip`，index.html 在ZIP根目录，附SHA-256清单。重复打包重建ZIP，不残留旧哈希资源。该构建显式载入官方v3 SDK，初始化失败显示重试；没有广告或账号功能。提交时打开 **Progress Save**，游客和登录用户均使用SDK Data；SDK接受保存不等于已证明跨设备同步。

三张PNG封面在 `releases/covers/`：1920×1080、800×1200、800×800；可编辑原稿在 `assets/art/covers/`，独立构图，宣传素材不进入游戏ZIP。预览视频留待正式发布阶段。

## 架构与协作

JavaScript + Three.js 正交2D + Vite；纯模型不依赖DOM、SDK或存储。1/120秒固定物理步；可见区域始终9:16，桌面用花园外壳填充两侧。纹理在加载时预热，窗口尺寸和DPR只影响显示。重新开始清理前局特效、音源与事件；标签页隐藏冻结模拟，回来主动继续。

- [实施规划与验收](docs/PLAN.md)
- [子agent分工与模型](docs/SUBAGENTS.md)：常规实现Sol high，QA Sol xhigh，检索Sol low，疑难升级Astra high；最多3个子agent并行。
- [素材来源与许可证](docs/ART-LICENSES.md)
- [平台接口与Portal验证步骤](docs/PLATFORM-QA.md)
- [实际QA结果与未测项](docs/QA-REPORT.md)

当前自动检查与Chrome浏览器证据见QA报告；浏览器触控模拟与真机分开记录。Edge、Safari、Android/iOS真机、实际声音听感、低端设备长期性能、CrazyGames Portal及审核仍待验证。Vite提示Three.js主块超过默认500kB警告线，完整包仍明显低于项目5MB预算。

原项目 flappyTest 仅用于只读规则参考。项目与新SVG按根目录 Apache-2.0 LICENSE；构建附项目及第三方许可。
