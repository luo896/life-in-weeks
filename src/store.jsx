import { createContext, useContext, useEffect, useState } from 'react'

const KEY = 'life-weeks-habit:v1'

export const DEFAULT_STATE = {
  // gridOrientation: '' = auto (landscape on wide screens, portrait on narrow); 'portrait' | 'landscape' once chosen
  profile: { name: '', birthdate: '', lifeExpectancyYears: 90, weightUnit: 'kg', gridOrientation: '' },
  baseline: null, // { date, bedtime, wakeTime, weightKg, dietTags:[], dietNotes, exercise, screenTime, mood, notes }
  goals: [], // { id, metric, current, target, unit, targetDate, pace, weeks }
  plan: { milestones: [], generatedAt: null },
  logs: [], // { id, date, bedtime, wakeTime, weightKg, adherence:{}, mood, note }
  journals: [], // { id, weekIndex, text, updatedAt } — one weekly reflection per life-week
  meta: { version: 1 },
}

export function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_STATE
    const p = JSON.parse(raw)
    return {
      ...DEFAULT_STATE,
      ...p,
      profile: { ...DEFAULT_STATE.profile, ...(p.profile || {}) },
      plan: { ...DEFAULT_STATE.plan, ...(p.plan || {}) },
      goals: p.goals || [],
      logs: p.logs || [],
      journals: p.journals || [],
    }
  } catch {
    return DEFAULT_STATE
  }
}

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [state, setState] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* storage full or unavailable — ignore */
    }
  }, [state])

  const api = {
    state,
    setProfile: (patch) => setState((s) => ({ ...s, profile: { ...s.profile, ...patch } })),
    setBaseline: (baseline) => setState((s) => ({ ...s, baseline })),
    addGoal: (goal) => setState((s) => ({ ...s, goals: [...s.goals, { id: uid(), ...goal }] })),
    updateGoal: (id, patch) =>
      setState((s) => ({ ...s, goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
    removeGoal: (id) => setState((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) })),
    setPlan: (plan) => setState((s) => ({ ...s, plan })),
    addLog: (log) =>
      setState((s) => {
        // one entry per date — replace if the date already exists
        const rest = s.logs.filter((l) => l.date !== log.date)
        return { ...s, logs: [{ id: uid(), ...log }, ...rest] }
      }),
    updateLog: (id, patch) =>
      setState((s) => ({ ...s, logs: s.logs.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
    removeLog: (id) => setState((s) => ({ ...s, logs: s.logs.filter((l) => l.id !== id) })),
    // weekly journal — one entry per week index; empty text removes it
    upsertJournal: (weekIndex, text) =>
      setState((s) => {
        const t = (text || '').trim()
        const exists = s.journals.some((j) => j.weekIndex === weekIndex)
        if (!t) return { ...s, journals: s.journals.filter((j) => j.weekIndex !== weekIndex) }
        const now = new Date().toISOString()
        if (exists) {
          return {
            ...s,
            journals: s.journals.map((j) => (j.weekIndex === weekIndex ? { ...j, text: t, updatedAt: now } : j)),
          }
        }
        return { ...s, journals: [...s.journals, { id: uid(), weekIndex, text: t, updatedAt: now }] }
      }),
    removeJournal: (id) => setState((s) => ({ ...s, journals: s.journals.filter((j) => j.id !== id) })),
    importData: (data) =>
      setState(() => ({
        ...DEFAULT_STATE,
        ...data,
        profile: { ...DEFAULT_STATE.profile, ...(data.profile || {}) },
        plan: { ...DEFAULT_STATE.plan, ...(data.plan || {}) },
        journals: data.journals || [],
      })),
    resetData: () => setState(DEFAULT_STATE),
  }

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>')
  return ctx
}
