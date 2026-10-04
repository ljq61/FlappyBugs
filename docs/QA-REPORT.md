# Flappy Bugs v0.1.1 QA

2026-10-04。发行验收由主agent执行；art只读复核44SVG和模型配置。qa角色此前额度中断，本批未声称独立QA完成。

## 本版本实际执行

| 检查 | 结果 | 边界 |
| --- | --- | --- |
| 锁定安装与Node回归 | npm ci通过；35/35测试通过 | 玩法15、平台15、clock3、声音2；包含60/120/144/165Hz固定步与存档/SDK失败 |
| Chrome生产输入 | 鼠标/键盘、暂停/恢复、失败重试、设置持久化通过 | 正常路径0page/console错误，无远程请求，无开发调试接口 |
| 显示/触控 | 13尺寸×DPR1/2共26组合通过；390×844实际浏览器触控模拟通过 | 9:16固定视野、无溢出、主按钮≥44px；非真机 |
| 失败容错 | 禁用storage仍可玩；缺SVG显示重试；SDK被屏蔽显示重试 | 故障注入路径，预期网络失败单独记录 |
| 官方SDK localhost | v3实际下载、local初始化、平台强制静音、开始/暂停/继续/死亡、语言存档重载通过 | 不是Portal或跨设备云同步证明 |
| 原创素材/封面 | 44份SVG原稿、41运行时路径；三PNG实际导出尺寸正确 | 1920×1080、800×1200、800×800；无旧照片/生成图/旧音频 |
| 包与版本 | 两种生产树均46文件、759,887字节；ZIP CRC/无重复/根index/逐字节一致；meta及桌面版本0.1.1 | ZIP包括项目及第三方LICENSE，源码/config不入包 |

Chrome 154.0.8037.95，macOS，Playwright headless，localhost HTTP。生产浏览器7/7组通过；检查报告和截图通过 [v0.1.1 Release](https://github.com/ljq61/FlappyBugs/releases/tag/v0.1.1) 的QA附件交付。本地原始证据位于 artifacts/qa/release-v0.1.1（Git忽略目录）。

## 危险柱头专项

14个上下柱头为五刺荆棘/针芦苇/锯齿叶/毒针菇/刺籽荚/焦黑火焰藤/扭曲刺藤；柱头怪脸退出，柱身眨眼/鼓嘴/摆叶保留。尖端停在原通道边缘，帽冠只向内伸缩；独立火焰固定基底，高度84%–100%跳动。没有新增持续火焰伤害，模型数值保持。

GPU专项6/6组：7类型×4动态时间，共28个边界样本无通道/宽边界外变化像素（0.04世界单位抗锯齿容差）；两端有独立火焰像素和帧变化；暂停与reduce-motion变化0；30次障碍创建/删除后GPU buffers均回到基线6；生产触控重试通过。该专项在0.1.1构建上重新执行，非30次真实重试/长时间性能证明。第一次执行因npm ci后旧Vite依赖缓存返回504 Outdated Optimize Dep而中断；改用独立5176开发服务强制重建缓存后6/6通过，未修改产品逻辑。

上一轮同一玩法/渲染核心的实际鼠标历史证据：分别撞上下柱扣到2HP并喷虫汁；一局23分、35.392秒、2HP，取得/结束星星、20分后移动柱，0意外暂停或错误。使用开发只读快照与固定初始随机源0.5，没有修改模型状态；发行批次只增加版本显示/打包/CI，未把历史35秒飞行当作重新执行。

## 构建身份与发布

| 交付物 | 标识 / SHA-256 |
| --- | --- |
| standalone入口 | assets/index-yatExFs2.js |
| CrazyGames入口 | assets/index-Gf8FalxG.js |
| 两种CSS | assets/index-3gzM5RfC.css |
| standalone树 | 4020013ca9f8b35ef39055b83f056ee6cd6896b9fbedb1c2858f376501460f33 |
| CrazyGames树 | 8bc395a267cf162a2446db2e3d70e37ee973fa0543e0f5b03129b1f64ad7c68f |
| CrazyGames ZIP（193,717字节） | 77c3614069eaae38b1481ef20bf744486ced964cb3bc01dfc5db280c10447dc8 |

GitHub dev/main的build及Pages部署结果见 [Actions](https://github.com/ljq61/FlappyBugs/actions/workflows/pages.yml)，远程提交、线上版本/资源/输入和Release附件需在部署完成后复核；记录由Release发行说明和QA附件补充，构建通过不替代线上验收。

仍pending：Android/iOS触屏/旋转/safe-area、Safari/Edge、扬声器听感、低端60FPS及10分钟运行、CrazyGames Developer Portal Preview/QA、真实账户云同步、宣传视频、CrazyGames审核和上线。Vite仍提示单JS块超过500kB，包预算通过不代替低端性能证明。
