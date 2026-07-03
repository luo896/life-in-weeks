# 架构设计

## 设计原则

1. **本地优先**：无后端、无账号、无网络请求。全部状态在浏览器 localStorage，导出 JSON 即备份。
2. **零运行时依赖**：只有 React + ReactDOM。图表（SVG）、周历网格（CSS Grid）、分享卡（Canvas）、可视化条全部手写 —— 包体小、无供应链风险、样式完全可控。
3. **一屏一生**：周历必须完整落在首屏内（这是产品的情绪核心），靠运行时测量自适应格子大小实现，而非固定尺寸。

## 组件结构

```
main.jsx
└─ StoreProvider (store.jsx)          全局状态 + 持久化
   └─ App.jsx                          视图路由（useState 切换，无路由库）
      ├─ Onboarding.jsx                profile.birthdate 为空时的引导页
      ├─ 侧边栏 / 底部标签栏 / 顶栏     布局壳
      ├─ Settings（App 内部组件）       设置弹窗
      └─ 当前视图（七选一）
         ├─ LifeGridView (LifeGrid.jsx)   周历 + 目标时间线 + 周记
         ├─ Baseline.jsx     ── 使用 Visuals.SleepBar
         ├─ Goals.jsx        ── 使用 Visuals.GapBar
         ├─ Plan.jsx
         ├─ Log.jsx
         ├─ Progress.jsx     ── 使用 Charts.LineChart
         └─ Share.jsx        ── 调用 lib/share.js
```

## 状态管理

单一 Context（`store.jsx`）：

- `useState(load)` 惰性初始化：启动时从 localStorage 读取并与 `DEFAULT_STATE` 深度合并（新增字段自动补默认值，旧备份天然向前兼容）。
- `useEffect` 在每次 state 变化时整体序列化写回。数据量级（数千条以内）下整写成本可忽略。
- 对外暴露语义化 API（`setBaseline` / `addGoal` / `upsertJournal` / `importData`…），组件不直接 `setState`。

**为什么不用 Redux/Zustand**：单人本地应用、更新频率低、无跨组件性能瓶颈，Context 足够且少一个依赖。

## 关键算法

### 周索引（life-week index）

一切围绕一个整数 `i`：出生那天是第 0 周的开始，`i = floor((date - birthdate) / 7天)`。

- 周历第 `i` 个格子 = 人生第 `i+1` 周
- 周记按 `weekIndex` 存储
- 目标按 `targetDate → weekIndexForDate()` 落到时间线上
- `lifeStats()` 输出 `lived / remaining / pct / currentWeekIndex`，其中 `currentWeekIndex` 被钳制在 `[0, totalWeeks-1]`，保证超龄（实际年龄 > 预期寿命）时"本周"标记仍落在最后一格。

### 一屏自适应网格（LifeGrid.useFitGrid）

```
可用高度 = 视口高度 − 网格顶部绝对位置 − 预留（图例/提示/移动端标签栏）
格子边长 = clamp(3px, min(可用宽/列数, 可用高/行数), 30px)
```

- `ResizeObserver` + `window.resize` 双监听，窗口变化实时重排。
- 格子 ≥ 9px 时用 2px 间隙，否则 1px（小格子密排更清晰）。
- 尺寸计算按最大间隙(2px)进行，保证任何分支都不会溢出。

### 横放 / 竖放

同一份 `cells` 数组，两种 CSS Grid 映射：

- **竖放**：`grid-template-columns: repeat(52, …)`，行优先填充 → 一行 = 一年。
- **横放**：`grid-template-rows: repeat(52, …)` + `grid-auto-flow: column`，列优先填充 → 一列 = 一年。

两种方向下 DOM 顺序都等于周索引，因此悬停/点击/标记逻辑完全无需分支。

方向解析优先级：`profile.gridOrientation`（用户点过按钮）→ 按视口宽度自动（≤860px 竖放，否则横放）。自动判断存在 state 中并监听 resize，窗口拉伸会实时切换。

### 计划生成（lib/plan.js）

纯函数 `generatePlan(baseline, goals)`：

- 时间类目标：跨午夜最短差值（`clockDiff` 归一到 ±720 分钟），按每周 15 分钟步进拆周。
- 体重类：按用户节奏（默认 0.5kg/周）线性插值出每周目标值。
- 习惯类：固定 4 阶段模板（记录触发 → 替换行为 → 连续打卡 → 自动化），周期可调。

输出的 `milestones[].durationWeeks` 同时驱动：计划卡片、每周任务汇总、周历未来色带。

### 周历上的色带

`bands = milestones.map(m => [lived + startOffset, +durationWeeks))`，渲染时未来格子落在区间内则覆盖里程碑颜色。「本周」格子的判定优先于色带，保证当前位置永远可见。

## 渲染性能

90 年 × 52 = 4680 个 div。实测（含 hover 缩放、re-render）流畅：

- `cells` 数组用 `useMemo`，仅在 stats/bands/journals/选中周变化时重建；
- 悬停信息只改 caption 文本，不触发网格重建（hover state 与 cells memo 解耦——`cells` 的类名不含 hover）；
- 若未来要支持 120 岁 ×2 密度，可换 Canvas 渲染，接口不变。

## 导出（lib/share.js）

- **JSON**：`Blob` + 临时 `<a download>`。
- **PNG 分享卡**：离屏 Canvas 1080×1350，手绘周历缩略图 + 数据摘要。
- **HTML 报告**：模板字符串拼接自包含单文件（内联 CSS、打印样式）；所有用户文本经 `esc()` 转义（`& < > "`），防 XSS/注入。

## 安全与隐私

- 无网络请求，数据不出本机。
- 导入 JSON 时做 `typeof object` 校验 + 与默认结构合并，异常捕获后提示失败。
- 报告/卡片中的用户输入全部转义后再渲染。
