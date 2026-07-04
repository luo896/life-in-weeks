// 多设备同步引擎：本地优先，登录后与 Cloudflare Worker 后端交换带版本号的快照
//
// 触发时机：应用启动 / 窗口重新聚焦 / 网络恢复 → 拉取；任何修改后 1.5s 防抖 → 推送
// 冲突（409）：另一台设备先写入 → mergeStates 按条目合并后重推

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useStore } from '../store.jsx'
import { mergeStates, adoptRemote } from './merge.js'

export const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:8787' : 'https://life-in-weeks-api.luo896.workers.dev')

const SYNC_KEY = 'life-weeks-habit:sync' // { token, user, version, lastSyncedAt }
const DIRTY_KEY = 'life-weeks-habit:sync-dirty' // '1' = 本地有未同步改动（防抖期间关页也不丢）
const PUSH_DEBOUNCE_MS = 1500
const FOCUS_PULL_MIN_MS = 60_000

function loadMeta() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_KEY)) || null
  } catch {
    return null
  }
}

const statesEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b)

const SyncContext = createContext(null)

export function SyncProvider({ children }) {
  const { state, importData } = useStore()
  const [meta, setMetaState] = useState(loadMeta)
  const [status, setStatus] = useState(() => (loadMeta()?.token ? 'syncing' : 'loggedOut'))
  const [loginError, setLoginError] = useState(false)

  const stateRef = useRef(state)
  stateRef.current = state
  const metaRef = useRef(meta)
  const dirtyRef = useRef(localStorage.getItem(DIRTY_KEY) === '1')
  // 最近一次「已知与云端一致」的状态签名：与之相同的 state 变化不算真实改动
  // （避免挂载、应用远端快照被误判成本地编辑而触发推送）
  const lastKnownRef = useRef(JSON.stringify(state))
  const timerRef = useRef(null)
  const busyRef = useRef(false)
  const initRef = useRef(false)
  const lastPullRef = useRef(0)

  const setMeta = (m) => {
    metaRef.current = m
    setMetaState(m)
    if (m) localStorage.setItem(SYNC_KEY, JSON.stringify(m))
    else localStorage.removeItem(SYNC_KEY)
  }

  const setDirty = (v) => {
    dirtyRef.current = v
    if (v) localStorage.setItem(DIRTY_KEY, '1')
    else localStorage.removeItem(DIRTY_KEY)
  }

  const applyToStore = (next) => {
    lastKnownRef.current = JSON.stringify(next)
    if (statesEqual(next, stateRef.current)) return
    importData(next)
  }

  const failStatus = () => setStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error')

  const api = async (path, opts) => {
    const res = await fetch(API_URL + path, {
      ...opts,
      headers: { Authorization: `Bearer ${metaRef.current?.token}`, ...(opts?.headers || {}) },
    })
    if (res.status === 401) {
      // 会话过期：退出登录态，本地数据原样保留
      setMeta(null)
      setStatus('loggedOut')
      throw new Error('unauthorized')
    }
    return res
  }

  // 推送本地快照；409 则按条目合并后重推（最多 3 轮）
  const pushLoop = async (data, baseVersion) => {
    let payload = data
    let base = baseVersion
    let merged = false
    for (let i = 0; i < 3; i++) {
      const res = await api('/sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseVersion: base, data: payload }),
      })
      if (res.ok) {
        const { version } = await res.json()
        return { version, data: payload, merged }
      }
      if (res.status !== 409) throw new Error(`push failed: ${res.status}`)
      const server = await res.json()
      payload = mergeStates(payload, server.data, metaRef.current?.lastSyncedAt)
      base = server.version
      merged = true
    }
    throw new Error('push failed: too many conflicts')
  }

  const finishSync = (version) => {
    setDirty(false)
    setMeta({ ...metaRef.current, version, lastSyncedAt: new Date().toISOString() })
    setStatus('synced')
  }

  // 完整同步：拉取远端 → 采纳或合并 → 需要时回推
  const syncNow = async () => {
    if (!metaRef.current?.token || busyRef.current) return
    busyRef.current = true
    setStatus('syncing')
    lastPullRef.current = Date.now()
    try {
      const res = await api('/sync')
      if (!res.ok) throw new Error(`pull failed: ${res.status}`)
      const remote = await res.json()
      const local = stateRef.current
      // 首次登录（从未同步过）且本地已有数据：视同有未同步改动，走合并而不是整体采纳
      const mustMerge = dirtyRef.current || (!metaRef.current.lastSyncedAt && !!local.profile.birthdate)

      if (remote.data && !mustMerge) {
        // 本地无改动：整体采纳远端（保留本机显示偏好）
        applyToStore(adoptRemote(local, remote.data))
        finishSync(remote.version)
      } else if (remote.data) {
        // 双方都有内容：合并后回推
        const merged = mergeStates(local, remote.data, metaRef.current.lastSyncedAt)
        applyToStore(merged)
        const done = await pushLoop(merged, remote.version)
        if (done.merged) applyToStore(done.data)
        finishSync(done.version)
      } else if (local.profile.birthdate) {
        // 云端还没有快照：把本地推上去
        const done = await pushLoop(local, remote.version)
        if (done.merged) applyToStore(done.data)
        else lastKnownRef.current = JSON.stringify(done.data)
        finishSync(done.version)
      } else {
        finishSync(remote.version)
      }
    } catch (e) {
      if (e.message !== 'unauthorized') failStatus()
    } finally {
      busyRef.current = false
    }
  }

  // 防抖推送（本地刚改完，通常无冲突，跳过拉取直接推）
  const pushSoon = () => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      if (!metaRef.current?.token) return
      if (busyRef.current) {
        pushSoon() // 正在同步：等这轮结束再推
        return
      }
      busyRef.current = true
      setStatus('syncing')
      try {
        const payload = stateRef.current
        const done = await pushLoop(payload, metaRef.current.version || 0)
        // 只有发生过合并才需要回写 store；原样推送成功时不要动 state，
        // 以免覆盖推送期间用户的新输入
        if (done.merged) applyToStore(done.data)
        else lastKnownRef.current = JSON.stringify(done.data)
        finishSync(done.version)
        // 推送期间又有新改动 → 再排一轮
        if (JSON.stringify(stateRef.current) !== lastKnownRef.current) {
          setDirty(true)
          pushSoon()
        }
      } catch (e) {
        if (e.message !== 'unauthorized') failStatus()
      } finally {
        busyRef.current = false
      }
    }, PUSH_DEBOUNCE_MS)
  }

  const fetchMe = async () => {
    try {
      const res = await api('/me')
      if (res.ok) setMeta({ ...metaRef.current, user: await res.json() })
    } catch {
      /* 拉不到用户信息不影响同步 */
    }
  }

  // 启动：截取 OAuth 回跳带回的 token，然后做首次同步
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    const h = new URLSearchParams(window.location.hash.slice(1))
    if (h.get('sync_token')) {
      setMeta({ token: h.get('sync_token'), user: null, version: 0, lastSyncedAt: null })
      setLoginError(false)
      history.replaceState(null, '', window.location.pathname + window.location.search)
    } else if (h.get('sync_error')) {
      setLoginError(true)
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    if (metaRef.current?.token) {
      if (!metaRef.current.user) void fetchMe()
      void syncNow()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 窗口聚焦 / 网络恢复 → 拉取
  useEffect(() => {
    const onFocus = () => {
      if (!metaRef.current?.token) return
      if (dirtyRef.current || Date.now() - lastPullRef.current > FOCUS_PULL_MIN_MS) void syncNow()
    }
    const onOnline = () => metaRef.current?.token && void syncNow()
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onOnline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 本地状态真实变化 → 标脏 + 防抖推送
  // （与最近已同步快照签名一致的变化 —— 挂载、应用远端数据 —— 不算改动）
  useEffect(() => {
    if (JSON.stringify(state) === lastKnownRef.current) return
    if (!metaRef.current?.token) return
    setDirty(true)
    pushSoon()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const returnBase = () => window.location.origin + window.location.pathname
  const value = {
    status,
    user: meta?.user || null,
    lastSyncedAt: meta?.lastSyncedAt || null,
    loggedIn: !!meta?.token,
    loginError,
    login: () => {
      window.location.href = `${API_URL}/auth/github/start?o=${encodeURIComponent(returnBase())}`
    },
    devLogin: (u = 'dev') => {
      window.location.href = `${API_URL}/auth/dev/login?u=${u}&o=${encodeURIComponent(returnBase())}`
    },
    logout: () => {
      clearTimeout(timerRef.current)
      setMeta(null)
      setDirty(false)
      setStatus('loggedOut')
    },
    syncNow,
  }

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync() {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync must be used within <SyncProvider>')
  return ctx
}
