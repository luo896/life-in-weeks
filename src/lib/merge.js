// 两台设备并发修改时的快照合并（仅在本地有未同步改动时使用）
//
// 规则：
// - journals / logs / goals 按业务主键逐条合并，双方都有的取 updatedAt 较新者
// - 只在远端存在的条目：updatedAt 晚于上次同步 → 是对方新增，保留；
//   早于上次同步（或无法判断且已同步过）→ 视为本机已删除，丢弃
// - profile / baseline 整块以本机为准（合并只发生在本机刚有操作时）
// - plan 取 generatedAt 较新者

function ts(v) {
  const t = Date.parse(v || '')
  return Number.isFinite(t) ? t : 0
}

function newerOf(a, b) {
  return ts(b.updatedAt) > ts(a.updatedAt) ? b : a
}

function mergeByKey(localArr, remoteArr, keyOf, since) {
  const remote = new Map((remoteArr || []).map((item) => [keyOf(item), item]))
  const out = []
  for (const item of localArr || []) {
    const k = keyOf(item)
    const r = remote.get(k)
    if (r === undefined) {
      out.push(item)
    } else {
      out.push(newerOf(item, r))
      remote.delete(k)
    }
  }
  for (const r of remote.values()) {
    // 无 updatedAt 的旧条目无从判断，宁可保留（重复出现好过丢数据）
    if (!r.updatedAt || ts(r.updatedAt) > since || !since) out.push(r)
  }
  return out
}

export function mergeStates(local, remote, lastSyncedAt) {
  const since = ts(lastSyncedAt)
  const plan = ts(remote.plan?.generatedAt) > ts(local.plan?.generatedAt) ? remote.plan : local.plan
  return {
    ...remote,
    ...local,
    profile: { ...local.profile },
    baseline: local.baseline || remote.baseline,
    plan,
    goals: mergeByKey(local.goals, remote.goals, (g) => g.id, since),
    logs: mergeByKey(local.logs, remote.logs, (l) => l.date, since).sort((a, b) =>
      a.date < b.date ? 1 : -1,
    ),
    journals: mergeByKey(local.journals, remote.journals, (j) => j.weekIndex, since).sort(
      (a, b) => a.weekIndex - b.weekIndex,
    ),
  }
}

// 采纳远端快照，但保留本机的显示偏好（横竖排、语言跟设备走）
export function adoptRemote(local, remote) {
  return {
    ...remote,
    profile: {
      ...remote.profile,
      gridOrientation: local.profile.gridOrientation,
      lang: local.profile.lang,
    },
  }
}
