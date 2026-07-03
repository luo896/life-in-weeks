# 数据模型

## 存储位置

- **Key**: `localStorage["life-weeks-habit:v1"]`
- **格式**: 单个 JSON 对象（下述结构）
- **写入时机**: 任何状态变化后整体写回（`store.jsx` 的 `useEffect`）
- **备份**: 「分享 → 导出备份」得到的 JSON 与存储结构完全一致，可直接导入

## 顶层结构

```jsonc
{
  "profile":  { /* 个人设置 */ },
  "baseline": { /* 现状基线，未填时为 null */ },
  "goals":    [ /* 目标数组 */ ],
  "plan":     { /* 改善计划 */ },
  "logs":     [ /* 每日打卡 */ ],
  "journals": [ /* 每周周记 */ ],
  "meta":     { "version": 1 }
}
```

## profile

```jsonc
{
  "name": "Yuan",                  // 可选，仅用于分享署名
  "birthdate": "1990-06-15",       // ISO 日期，整个应用的时间基准
  "lifeExpectancyYears": 90,       // 预期寿命（岁），决定总周数 = round(年 × 52)
  "weightUnit": "kg",              // "kg" | "lb"，仅影响显示
  "gridOrientation": "",           // "" = 自动（宽屏横放/窄屏竖放）| "portrait" | "landscape"
  "lang": ""                       // "" = 自动（跟随系统）| "zh" | "en"
}
```

## baseline（现状基线）

```jsonc
{
  "date": "2026-06-01",            // 记录日期
  "bedtime": "01:00",              // "HH:MM"
  "wakeTime": "08:30",
  "weightKg": 78,                  // number；未填为 ""
  "dietTags": ["常吃夜宵", "含糖饮料"],
  "dietNotes": "晚上爱点外卖",
  "exercise": "每周1次",
  "screenTime": "睡前刷手机1.5小时",
  "mood": "",
  "notes": ""
}
```

## goals[]（目标）

四种 `metric`，字段略有差异：

```jsonc
// 时间类（bedtime / wakeTime）
{ "id": "abc123", "metric": "bedtime", "current": "01:00", "target": "23:00", "targetDate": "2026-09-01" }

// 体重
{ "id": "def456", "metric": "weight", "current": 78, "target": 70,
  "unit": "kg", "pace": 0.5, "targetDate": "2026-12-31" }   // pace: 每周节奏，空则默认 0.5

// 习惯
{ "id": "ghi789", "metric": "habit", "target": "戒掉睡前刷手机", "weeks": 8, "targetDate": "" }
```

`id` 由 `uid()` 生成（随机 base36 + 时间戳后缀）。

## plan（改善计划）

由 `generatePlan()` 从 goals 派生，可随时重新生成：

```jsonc
{
  "generatedAt": "2026-06-29T02:11:05.000Z",   // null = 尚未生成
  "milestones": [
    {
      "id": "abc123-m",
      "metric": "bedtime",
      "title": "入睡时间 01:00 → 23:00",
      "startOffset": 0,             // 相对"当前周"的起始偏移（周）
      "durationWeeks": 8,           // 决定周历色带长度
      "from": "01:00",
      "to": "23:00",
      "perWeek": "每周提前/推后约 15 分钟",
      "steps": [ { "week": 1, "label": "第 1 周：入睡 00:45" } /* … */ ]
    }
  ]
}
```

## logs[]（每日打卡）

**每个日期最多一条**（同日期保存 = 覆盖）：

```jsonc
{
  "id": "xyz",
  "date": "2026-06-28",            // ISO 日期，唯一键
  "bedtime": "23:55",
  "wakeTime": "08:00",
  "weightKg": 76.3,                // number 或 ""
  "adherence": { "体重 78 → 70 kg": true, "戒掉睡前刷手机": false },
                                    // key = 里程碑标题（计划重新生成后旧 key 保留在历史里）
  "mood": "🙂",                    // 五档 emoji
  "note": "今天状态不错"
}
```

## journals[]（周记）

**每个周索引最多一篇**（`upsertJournal` 覆盖；文本清空则删除）：

```jsonc
{
  "id": "jkl",
  "weekIndex": 1881,               // 人生第 weekIndex+1 周；从 birthdate 起算
  "text": "这周开始认真早睡。",
  "updatedAt": "2026-06-29T01:00:00.000Z"
}
```

> ⚠️ `weekIndex` 依赖 `profile.birthdate`。修改出生日期不会迁移周记 —— 周序号不变，对应的日历日期随之平移。

## 派生数据（不存储）

以下均在渲染时计算，**不写入存储**：

| 数据 | 来源 |
|---|---|
| 已度过/剩余/百分比/当前周 | `lifeStats(birthdate, years)` |
| 睡眠时长 | `sleepHours(bedtime, wakeTime)`（自动处理跨午夜） |
| 趋势序列 | `weightSeries / sleepDurationSeries / bedtimeSeries(logs)` |
| 连续打卡 | `computeStreak(logs)`（允许"今天还没打"从昨天数起） |
| 坚持率 | `adherenceRate(logs)`：全部勾选项中 true 的占比 |
| 目标完成度 | `GapBar`：`(最近打卡值 − 现状) / (目标 − 现状)`，时间类用跨午夜最短差 |

## 版本与兼容

- `meta.version = 1`，key 带 `:v1` 后缀。未来结构大改时：新 key + 启动迁移。
- **向前兼容**：`load()` 与 `importData()` 都将读入数据与 `DEFAULT_STATE` 合并 —— 旧备份缺 `journals` / `gridOrientation` 等新字段时自动补默认值，可安全导入。
- 导入是**整体替换**（先确认弹窗），不是合并。

## 隐私

全部数据只存在浏览器 localStorage：

- 清除站点数据 / 换浏览器 / 无痕模式 = 数据不在
- 建议定期「导出备份（JSON）」
- 应用本身无任何网络请求
