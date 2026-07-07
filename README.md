# 人生周历 · 习惯改造计划 (Life in Weeks · Habit Reset)

> 如果把一生画成一张表，每个方块是一周 —— 你会发现格子比想象的少得多。

一个把「人生 ~90×52 周倒计时」带来的紧迫感，转化为具体习惯改造的**本地网页应用**。
灵感来自看到人生周历倒计时表受到震撼的那一刻：用它诚实记录现状、设定目标、生成逐周改善计划、每日打卡、写周记、追踪进度，并把改变的过程分享出去。

**数据默认只保存在本机浏览器（localStorage）；用 GitHub 账号登录后可多设备同步（Cloudflare Worker + D1），随时可退出。**

🌐 **在线使用**：<https://luo896.github.io/life-in-weeks/>（推送 `main` 分支自动部署，支持 PWA 安装到主屏幕）
📖 **设计哲学与使用说明**：<https://luo896.github.io/life-in-weeks/about.html>

**English** — A local-first web app that turns the urgency of a "life in weeks" (~90×52) countdown grid into concrete habit change: record your baseline habits, set goals, generate week-by-week improvement plans, check in daily, keep weekly journals, and share your progress. Data stays in your browser by default; optional GitHub sign-in enables multi-device sync (Cloudflare Worker + D1). UI in Chinese / English / Japanese.

**日本語** — 人生を約90×52週のグリッドで可視化し、現状の記録・目標設定・週ごとの改善プラン・毎日のチェックイン・週記・進捗共有までを行うローカルファーストWebアプリ。データは既定でブラウザのみに保存。GitHub ログインで複数端末の同期にも対応（Cloudflare Worker + D1）。UIは中・英・日対応。

## ✨ 功能总览

| 模块 | 说明 |
|---|---|
| 🗓️ **人生周历** | 一生画成周格子，整表一屏放下；支持**竖放/横放**切换（默认按屏幕自动选择）。已度过 / 本周（跳动高亮）/ 未来一目了然；改善计划以彩色色带叠加在未来格子上；写过周记的周显示金色圆点 |
| 🎯 **目标时间线** | 周历下方，目标按期望日期排成时间线，显示「还有 N 周」 |
| 📝 **周记** | 点周历任意格子即可为那一周写周记；每周一篇，可改可删 |
| 📍 **现状基线** | 入睡/起床（自动算睡眠时长 + 24 小时睡眠时段可视化）、体重、饮食标签、运动、屏幕时间 |
| 🎯 **目标** | 入睡/起床/体重/习惯四类；进度条实时显示「现状 → 最近打卡 → 目标」完成百分比 |
| 🧭 **改善计划** | 一键从现状→目标生成循序渐进的逐周方案（入睡每周提前 15 分钟、减重每周约 0.5kg、习惯 8 周养成弧线） |
| ✅ **打卡** | 每日记录实际作息/体重/计划完成项/心情/备注；连续天数 streak |
| 📈 **进度** | 体重、睡眠时长、入睡时间趋势图（含目标虚线）；坚持率统计 |
| 🔗 **分享** | 分享卡片（PNG）· 完整过程报告（HTML，可打印为 PDF，含全部周记）· JSON 备份/导入 |
| ☁️ **多设备同步** | 设置里用 GitHub 登录后自动云端同步；换设备登录即恢复全部数据；两台设备同时改也会按条目合并，不互相覆盖 |
| 📖 **循证提示** | 睡眠/运动/饮食/体重等输入旁附 WHO、AASM 等权威机构建议与可溯源链接；BMI 采用亚洲人群阈值，含腰高比 |
| 🌿 **健康寿命锚点** | 可选设置健康预期寿命（WHO HALE）与期望退休年龄，周历分出"健康区"——好习惯的目标是让绿色区更长 |
| ✨ **人生清单** | 记下有生之年想经历的事和希望的年龄，自动化为周历上的紫色星标（体验有年龄窗口——《Die with Zero》） |

## 🚀 快速开始

```bash
npm install      # 首次安装依赖（需要 Node.js ≥ 18）
npm run dev      # 启动开发服务器 → http://localhost:5174
```

生产构建：

```bash
npm run build    # 输出到 dist/，任何静态服务器均可托管
npm run preview  # 本地预览构建产物
```

首次打开输入生日与预期寿命（经典人生周历用 90，也可以用最触动你的数字），即可看到你的人生周历。

## 🛠 技术栈

- **React 18 + Vite 6**，除此之外**零运行时依赖**
- 周历网格、趋势图（SVG）、分享卡片（Canvas）、可视化组件全部手写
- **中 / 英 / 日 三语**：默认跟随系统语言，设置中可切换（含计划文案、分享卡、报告与导出文件名）
- **可选云同步后端**：`server/` 下的零依赖 Cloudflare Worker（GitHub OAuth + D1 快照存储 + 乐观锁版本号），前端本地优先、防抖推送、409 冲突按条目合并
- 深色主题，桌面（侧边栏）/移动（底部标签栏）自适应

## 📁 目录结构

```
src/
  App.jsx            应用骨架：导航、顶栏、设置弹窗
  store.jsx          全局状态 + localStorage 持久化（含数据模型注释）
  styles.css         全部样式（CSS 变量深色主题）
  lib/
    date.js          周历与时间计算（周索引 ↔ 日期互转、睡眠时长、跨午夜时差）
    plan.js          改善计划生成算法
    stats.js         打卡数据的趋势序列与统计
    share.js         JSON 备份、PNG 分享卡、HTML 过程报告
  components/
    Onboarding.jsx   首次进入：输入生日
    LifeGrid.jsx     人生周历（自适应一屏、横竖切换、周记标记、目标时间线）
    Baseline.jsx     现状基线（含现状一览可视化）
    Goals.jsx        目标（含差距进度条）
    Plan.jsx         改善计划
    Log.jsx          每日打卡
    Progress.jsx     进度图表
    Share.jsx        分享与备份
    Charts.jsx       SVG 折线图（含目标线）
    Visuals.jsx      SleepBar 睡眠时段条 / GapBar 目标差距条
    ui.jsx           通用 UI 原语（Card/Field/Button/Stat…）
  lib/
    sync.jsx         多设备同步引擎（登录态、拉取/防抖推送、冲突处理）
    merge.js         两设备并发修改的按条目合并算法
server/              可选云同步后端（Cloudflare Worker + D1）
  src/index.js       GitHub OAuth + 会话 token + 快照同步 API（零依赖）
  schema.sql         D1 表结构（users / snapshots）
  wrangler.toml      Worker 配置（部署步骤见文件内注释）
```

## 📚 文档

- [更新日志](CHANGELOG.md)

## ⚠️ 已知行为

- 周记与周索引绑定，而周索引由出生日期推导：**修改出生日期后，已有周记会对应到新的日期区间**（周序号不变）。
- 未登录时数据在浏览器本地：换浏览器/设备或清空站点数据都会丢失，请用 GitHub 登录开启云同步，或用「分享 → 导出备份（JSON）」定期备份。
- 横竖排方向与语言是**设备偏好**，不参与同步；计划文案保持生成时的语言。

## License

MIT
