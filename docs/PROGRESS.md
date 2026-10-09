# Flappy Bugs 当前进度

更新：2026-10-09。版本：**0.2.1**。交付路径：`dev → main → GitHub Pages`。

| 范围 | 实施状态 | 实际验证 |
| --- | --- | --- |
| 完美连击、普通飞行充能、虚空轮廓/残影 | 已实现 | 模型/视觉逻辑回归包含在71项测试中 |
| 傍晚蓝调、无刺火焰扭动 | 已实现 | SVG/火焰测试、实际GPU帧检查 |
| 七款柱体/十四上下根座接缝 | 已实现 | 七款静态、两移动位置、独立54几何/14栅格/9截图复核 |
| 仅甲壳换色、外观与尾迹图案选择 | 已实现 | 皮肤测试与浏览器预览；不修改头/眼/腿/翅膀 |
| Star跳跃星星、Stardust闪烁粒子 | 已实现 | 粒子生命周期/数量/动态测试 |
| 30/70单局、200/500/1000累计、10/20连击解锁 | 已实现 | 解锁边界回归；全条件见README |
| 累计过柱与v1旧档迁移 | 已实现 | 平台25项测试；回合检查点增量/失败重试去重 |
| 跳跃音效柔和包络 | 已实现 | 声音逻辑/包络测试；手机听感待真机 |
| 分数区分、回主菜单、中英文标题 | 已实现 | 浏览器菜单/结算/输入烟测 |
| 三封面与横/竖构图留白 | 已实现 | 可编辑SVG/PNG尺寸及布局复核；新版视频待制作 |
| 本地版本与发布包 | 已完成 | 71/71；两构建/审计；ZIP CRC/逐文件一致；0.2.1 |
| GitHub dev/main与Pages | 已完成 | dev CI、main build/deploy、线上56文件与实际输入通过；记录如下 |
| CrazyGames Preview/重新审核 | 待执行 | GitHub交付不代表平台审核/上线 |
| 真机、全尺寸/DPR、长期性能/音频 | 待执行 | 不沿用历史版本通过结论 |

## 交付记录

本轮已先推送dev，CI通过后快进合入main，Pages部署通过。[Actions](https://github.com/ljq61/FlappyBugs/actions/workflows/pages.yml) · [在线游戏](https://ljq61.github.io/FlappyBugs/)。

- 游戏内容提交：`69a4e68260f748c1333b3c81d75c9adc37176fc6`，包含产品提交`79a8946`及main旧封面提交`e7b387d`的历史；封面与本轮确认原稿哈希一致。该次远端核对dev/main均指向此内容提交。
- [dev CI passed](https://github.com/ljq61/FlappyBugs/actions/runs/37868020984)；[main build/deploy passed](https://github.com/ljq61/FlappyBugs/actions/runs/37868118574)。Pages `build_type=workflow`。
- 线上版本meta/侧栏均0.2.1，入口`assets/index-DJuAfuny.js`；56文件HTTP200且与本地standalone逐文件字节一致，共824,736字节。
- 在线1280×720浏览器实际输入：鼠标起飞/空格、暂停/继续、结算/重试/回菜单、甲壳与尾迹锁定条件均通过，console error/warn为空。本轮后续只补记文档，不改变该生产树；最终Git状态由对应分支/Actions读取。

没有加入广告、账号或全球排行榜。没有创建本轮GitHub Release，也没有上传CrazyGames。SDK接受保存与真正跨设备同步分开验证；累计去重账本保留最近64回合，跨设备同时写入并非原子操作。

[版本变化](../CHANGELOG.md) · [QA边界](QA-REPORT.md) · [发布说明](RELEASE.md) · [人工质量清单](QUALITY-REWORK.md)
