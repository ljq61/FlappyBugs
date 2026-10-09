# 版本与 GitHub 发布

当前版本：**0.2.1**。日期：2026-10-09。

## 版本来源

package.json 是唯一版本来源；package-lock.json同步根版本。Vite读取该值，注入 `application-version` 元信息与桌面侧栏版本。ZIP及相邻JSON清单使用同一版本。存档仍采用v1格式，版本补丁不清空用户成绩。

## 分支与发布顺序

1. 在dev完成改动，更新README、CHANGELOG及相关文档；用 `npm version patch --no-git-tag-version` 更新下一补丁版本。
2. `npm ci`、`npm test`、`npm run package:standalone`、`npm run package:crazygames`；实际浏览器检查输入、暂停/恢复、重试、多尺寸和版本。ZIP检查根index、CRC、条目及与构建树逐字节一致。
3. 提交并推送dev；等待 [Validate and publish](https://github.com/ljq61/FlappyBugs/actions/workflows/pages.yml) 的build通过。
4. 更新main，优先fast-forward合入dev，再推送main。Pages设置必须为 **GitHub Actions / build_type=workflow**；部署仅上传dist。
5. 等待main build/deploy通过。检查 [在线游戏](https://ljq61.github.io/FlappyBugs/) 的版本、HTML资源引用和实际鼠标/键盘/触屏模拟，不以CI绿灯替代线上检查。
6. 只有该轮另获GitHub Release授权后，在已部署提交创建 `v<version>` 标签与 [GitHub Release](https://github.com/ljq61/FlappyBugs/releases)；上传两种ZIP、两份SHA-256清单、三张封面与QA证据，核对远程dev/main/tag提交及Release附件摘要。

工作流同时验证dev和main；dev不部署Pages，PR也不部署。失败修复仍先dev，再main。历史标签不重写；回退使用新提交，保留发行记录。

## 交付边界

- standalone ZIP用于普通静态托管和GitHub Pages；CrazyGames ZIP才显式加载官方SDK。
- releases目录为本地生成物，不提交Git；通过Release附件分发。封面是SVG导出PNG，游戏包本身只有原创矢量资源与构建产物。
- Node测试、Chrome输入/触控模拟、SDK localhost、线上Pages分别验收。当前QA由主agent执行，接缝及发布差异有独立qa复核；历史v0.1.1中断不记为独立验收。
- CrazyGames Portal、真实账户云同步、真机/低端长时间性能、宣传视频、审核/上线仍待验证；GitHub发行不等于CrazyGames上架。

工作流基于官方 [configure-pages](https://github.com/actions/configure-pages)、[upload-pages-artifact](https://github.com/actions/upload-pages-artifact)、[deploy-pages](https://github.com/actions/deploy-pages) 接口；Actions版本在v0.1.1发布时通过官方仓库核验；本轮沿用现有workflow，以本次Actions执行结果核验。

## 0.2.1交付记录

本轮授权范围为版本/文档/进度更新、推送dev并合入main；现有main工作流自动部署Pages。不额外创建标签/Release，不上传CrazyGames。

- 本地71/71测试、两种生产构建/审计、ZIP CRC与生产树逐文件字节比对通过。
- 两包均216,318字节，各56文件；入口、版本与摘要见[QA报告](QA-REPORT.md)。本地产物为 `releases/flappybugs-0.2.1-{standalone,crazygames}.zip` 及同名JSON清单。
- 远端main的独立旧封面提交先合回dev保留历史；最终封面采用用户本轮确认的傍晚蓝调、自然比例标题与横/竖留白布局。
- Git/CI/Pages的实际状态在[进度表](PROGRESS.md)记录；线上必须核对0.2.1 meta、完整静态树及实际输入，不仅核对Actions绿灯。
- 新版三封面源仍在assets/art/covers；游戏ZIP不含宣传封面。真机音频/性能、Portal、登录云同步、新版视频和重新审核待验证。

## 0.1.1 已执行发布验证

首次应用提交8f2e473的dev构建与main构建/部署均通过。2026-10-04线上全部46文件HTTP200，SHA-256与本地冻结树一致；桌面键盘和手机尺寸触控模拟均通过完整开始/暂停/恢复/死亡/重试与偏好重载，版本0.1.1，0页面错误。该结果写入QA报告后，文档提交同样先dev、后main。发行截图复核发现版本号与页脚重叠，修正间距并重新通过26尺寸与浏览器7组检查，最终构建指纹见QA报告；v0.1.1标签指向最终提交，完整SHA见Release说明。CrazyGames状态仍为预备ZIP，未上传平台。

公开QA附件仅包含已公开文档、验收汇总与游戏截图，不附本地脚本、原始诊断日志或机器路径。自动审批曾拒绝原始诊断ZIP外发，现改为公开摘要；完整原始证据留在本地。
