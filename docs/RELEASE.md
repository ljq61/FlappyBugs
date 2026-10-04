# 版本与 GitHub 发布

当前版本：**0.1.1**。日期：2026-10-04。

## 版本来源

package.json 是唯一版本来源；package-lock.json同步根版本。Vite读取该值，注入 `application-version` 元信息与桌面侧栏版本。ZIP及相邻JSON清单使用同一版本。存档仍采用v1格式，版本补丁不清空用户成绩。

## 分支与发布顺序

1. 在dev完成改动，更新README、CHANGELOG及相关文档；用 `npm version patch --no-git-tag-version` 更新下一补丁版本。
2. `npm ci`、`npm test`、`npm run package:standalone`、`npm run package:crazygames`；实际浏览器检查输入、暂停/恢复、重试、多尺寸和版本。ZIP检查根index、CRC、条目及与构建树逐字节一致。
3. 提交并推送dev；等待 [Validate and publish](https://github.com/ljq61/FlappyBugs/actions/workflows/pages.yml) 的build通过。
4. 更新main，优先fast-forward合入dev，再推送main。Pages设置必须为 **GitHub Actions / build_type=workflow**；部署仅上传dist。
5. 等待main build/deploy通过。检查 [在线游戏](https://ljq61.github.io/FlappyBugs/) 的版本、HTML资源引用和实际鼠标/键盘/触屏模拟，不以CI绿灯替代线上检查。
6. 在已部署提交创建 `v<version>` 标签与 [GitHub Release](https://github.com/ljq61/FlappyBugs/releases)；上传两种ZIP、两份SHA-256清单、三张封面与QA证据，核对远程dev/main/tag提交及Release附件摘要。

工作流同时验证dev和main；dev不部署Pages，PR也不部署。失败修复仍先dev，再main。历史标签不重写；回退使用新提交，保留发行记录。

## 交付边界

- standalone ZIP用于普通静态托管和GitHub Pages；CrazyGames ZIP才显式加载官方SDK。
- releases目录为本地生成物，不提交Git；通过Release附件分发。封面是SVG导出PNG，游戏包本身只有原创矢量资源与构建产物。
- Node测试、Chrome输入/触控模拟、SDK localhost、线上Pages分别验收。当前QA由主agent执行，额度中断的qa角色未当作独立验收。
- CrazyGames Portal、真实账户云同步、真机/低端长时间性能、宣传视频、审核/上线仍待验证；GitHub发行不等于CrazyGames上架。

工作流基于官方 [configure-pages](https://github.com/actions/configure-pages)、[upload-pages-artifact](https://github.com/actions/upload-pages-artifact)、[deploy-pages](https://github.com/actions/deploy-pages) 接口；Actions版本在本次发布前通过官方仓库核验。
