import type { InspectionResult } from './types'

const KEY = 'gasket-history'
const MAX_ITEMS = 500

function readAll(): InspectionResult[] {
  const raw = localStorage.getItem(KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as InspectionResult[]
  } catch {
    return []
  }
}

function writeAll(items: InspectionResult[]) {
  const capped = items.slice(0, MAX_ITEMS)
  localStorage.setItem(KEY, JSON.stringify(capped))
}

export function listHistory(username?: string): InspectionResult[] {
  const all = readAll()
  return username ? all.filter((r) => r.user === username) : all
}

export function getInspection(id: string): InspectionResult | null {
  return readAll().find((r) => r.id === id) ?? null
}

export function saveInspection(r: InspectionResult) {
  const all = readAll()
  all.unshift(r)
  writeAll(all)
}

export function updateMemo(id: string, memo: string) {
  const all = readAll()
  const idx = all.findIndex((r) => r.id === id)
  if (idx === -1) return
  all[idx].memo = memo
  writeAll(all)
}

export function deleteInspection(id: string) {
  writeAll(readAll().filter((r) => r.id !== id))
}
