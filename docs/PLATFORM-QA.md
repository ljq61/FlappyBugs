# Platform adapters and QA

协议说明初版：2026-10-04；v0.2.1存档更新：2026-10-09。对应 PLAN：C6 / AC7 / T7；音频接线同时涉及 C5 / AC6 / T6。

## 官方边界

- HTML5 使用 `https://sdk.crazygames.com/crazygames-sdk-v3.js`，等待 `SDK.init()` 后才能访问模块。本实现只在显式 crazygames 构建中动态载入该脚本。允许 SDK 的 `local`、`crazygames` 环境；`disabled` 环境明确失败。[SDK introduction](https://docs.crazygames.com/sdk/intro/)
- `gameplayStart` 用于开始和真实恢复；`gameplayStop` 用于结算、菜单、显式暂停。不要因失焦或离开游戏区域发送 stop/start，平台自行处理。适配器不注册 visibility/focus 监听。[Game SDK](https://docs.crazygames.com/sdk/game/)
- `game.settings.muteAudio` 以及 `addSettingsChangeListener`／`removeSettingsChangeListener` 控制平台强制静音，优先级高于游戏设置。`loadingStart`／`loadingStop` 报告实际资源加载区间。[Game SDK](https://docs.crazygames.com/sdk/game/)
- Data 初始化后提供 `getItem`／`setItem`。游客和登录用户都仅使用 Data，提交时必须打开 Progress Save。游客由 SDK 管理本地数据，登录后由平台同步。本实现没有登录、账号或额外云端请求。[Data SDK](https://docs.crazygames.com/sdk/data/)

## 主入口契约

`src/platform/index.js`：

```js
const platform = await createPlatform({
  mode: import.meta.env.VITE_PLATFORM || 'standalone',
  onSettings: ({ muteAudio }) => {
    platformMuted = muteAudio;
    audio.setMuted(userSound, platformMuted);
  },
});
const progress = await platform.loadProgress();
userSound = progress.sound;
audio.setMuted(userSound, platformMuted);
```

`onSettings` 在 factory 返回前先通知初值；回调不能引用尚未赋值的 `platform`。主入口应在打开玩法输入前加载 progress。音频接口接收两个布尔值 `setMuted(userSound, platformMuted)`：第一项是用户声音是否开启，第二项是平台是否强制静音；总线内部按 `platformMuted || !userSound` 决定静音。每次任一值变化都传入两个当前值，用户开关不得清除平台静音。

| 接口 | 语义 |
| --- | --- |
| `kind` | `standalone` 或 `crazygames` |
| `loadProgress(): Promise<{best,bestCombo,totalPassed,gateRuns,skin,trail,sound,language}>` | 初始化读取；分数/连击/累计量默认0、sound默认true、language默认en、外观默认classic/cloud；返回副本 |
| `saveProgress(patch): Promise<{saved,progress}>` | 按序存储；best/bestCombo只接受非负安全整数且保留最大值；totalPassed由回合检查点增量累加；sound 只接受布尔值，language 只接受 en/zh |
| `gameplayStart()`／`gameplayStop()` | 同步；真实变化返回 true，重复返回 false；SDK 同步异常透传，可重试 |
| `loadingStart()`／`loadingStop()` | 同步且去重；主入口按真实素材加载区间调用 |
| `getSettings()` | 返回 `{muteAudio}` 副本 |
| `subscribeSettings(fn)` | 立即通知初值，再通知变更；返回取消订阅函数 |
| `dispose()` | 清理平台设置监听；重复安全；不额外发送 gameplayStop；未开始的存档队列项拒绝 |

普通静态站点使用默认 standalone 构建。平台 ZIP 使用 `VITE_PLATFORM=crazygames` 构建；SDK 环境判断不用于降级到 standalone。脚本失败或 SDK 初始化失败／15秒超时抛出带 `code` 的 PlatformError：`sdk-load`、`sdk-init`、`sdk-environment`、`sdk-contract`。入口显示可重试错误，重试重新调用 factory。SDK Data 错误直接 reject，由入口显示保存失败／重试；不显示“云同步成功”。

保存键是单条 JSON `flappybugs:v1:progress`，使分数和偏好一次写入，不读取旧游戏存档。每次写前读取已存 best；初次慢读、慢写和旧分数快照由同一队列序列化，失败不会堵住后续重试。有效偏好按调用次序更新；主入口应传变化字段（声音只传 sound、语言只传 language），避免无关旧快照覆盖新偏好。平台保存结果 `saved='platform'` 只说明 SDK 接受 setItem，无法证明服务端已同步。standalone 返回 local 或 memory；memory 仅本 adapter 生命周期有效。

限制：SDK 存储没有跨设备原子 compare-and-set，无法承诺两台设备恰好同时写时全局最大值；该情形需 Portal 实测。dispose 不能撤销已经进入底层 SDK 的写入。页面隐藏可冻结本地模拟和音频，回来提示继续；单纯 visibilitychange 不发 SDK stop/start，适配器仍保留 playing 状态，继续调用 start 时会去重。显式暂停和结算仍发送 stop。

## v0.2.1累计过柱与外观存档

沿用 `flappybugs:v1:progress`。`best`是历史单局最高分、`bestCombo`是最高完美连击；`totalPassed`记录累计过柱。`saveProgress({gateRuns:[{id,passed}],...patch})`按每个回合已保存最大值累计差量；最高分和检查点同次保存不会重复计数。main在过柱/结算时保留未保存检查点，失败可重试，不在重试或回菜单时重复累加。

旧档无有效累计量时从best迁移下限；已有合法累计量保持。检查点只接受非空且≤128字符ID、非负安全整数数量，最近64回合保存账本；累计量到安全整数上限饱和。64条之外的旧回合重放、跨设备/标签页同时读写不承诺原子去重。皮肤/尾迹保存稳定ID，`sunny`沿用为Star；实际选择按当前解锁条件回退，未加入购买或广告解锁。

2026-10-09：平台Node测试25/25通过（包含在全套71项内），覆盖旧档迁移、非法值、重复/递增检查点、多回合、失败重试、已写入后抛错去重、旧分数防覆盖和顺序跨标签页保存。SDK接受写入与真实云同步仍分开报告；本轮没有重新执行真实SDK/Portal验证。

## 已执行验证

命令：`node --test tests/platform.test.js`；2026-10-04 executed / passed：15 tests，0 failed。

- standalone 不加载 SDK、默认值、重建适配器后持久化、存储读／写拒绝后内存继续、非法数据规范化。
- SDK 初始化等待、拒绝／超时、disabled 环境、缺失模块、脚本请求去重、失败移除并重试、脚本超时。
- gameplay/loading 去重、SDK 同步异常可重试、平台静音初值和设置更新、订阅移除／dispose。
- 初次写前读取、慢读慢写队列、后到旧分数、不覆盖已存在更高分、保存前重读更高分、Data 失败不写和后续恢复。

上述 15 项是 Node SDK stub／存储注入测试。

主 agent 提供的生产构建真实 SDK 本地验证：2026-10-04，Chrome 154.0.8037.95，localhost，executed / passed：

- 实际获取官方 v3 远程脚本，SDK 初始化后环境为 `local`。
- `?muteAudio=true` 使声音按钮禁用；平台强制静音优先于用户开关。
- 实际执行开始、显式暂停、继续和死亡的 gameplay 生命周期。
- 通过 SDK Data 保存语言设置，重载后保持。
- 屏蔽 SDK 请求后出现可重试失败，恢复请求并重试成功。

该结果仅覆盖生产构建在 localhost 使用真实 SDK 的行为；声音输出、Portal Preview、登录账号、跨设备同步、真机和上线仍 pending。本地 SDK 环境不等同于平台环境验收。

## Portal Preview 验收步骤（planned / pending）

主 agent 后续获得上传授权后，在 Developer Portal 用本次 crazygames ZIP，并打开 Progress Save；记下 ZIP 哈希、Portal game/build ID、浏览器版本、日期、网络及测试账号／游客状态。Preview 比本地 SDK 模拟更接近实际平台。[Development and testing](https://docs.crazygames.com/sdk/intro/)

1. 确认只请求官方 v3 SDK，初始化完成后才进入 ready；屏蔽 SDK 请求时有重试界面，恢复请求后可重试。独立站构建在 Network 中无 SDK 请求。
2. 记录一局开始、重复输入、死亡、重试、显式暂停／继续的 SDK start/stop 次数；切出标签页再回来只冻结模拟，不新增失焦事件；无双重 stop。
3. 使用平台静音及本地 SDK `?muteAudio=true` 检查 BGM、推进、伤害、失败音效全部静音；在游戏里切“声音开”仍静音；平台解除静音后按用户偏好恢复。
4. 游客先保存高分、声音和语言，重载后核对；再做较低分重载，best 不降低。登录账号同样检查；如有第二台设备，核对同步，记录延迟。不要以 setItem 返回就标记云同步 passed。
5. 验证 Progress Save 配置缺失或 Data 抛错时不悄悄存到自有 localStorage；记录失败和重试。检查无广告请求、账号弹窗、排行榜或额外后端。
6. 记录 Portal 自动 QA 结果及真实声音／移动输入结果；每项标 executed/passed/failed/pending。Preview 通过、提交成功、上线是独立状态。

当前 Portal 状态：全部 pending；未上传、登录、提交审核或上线。
