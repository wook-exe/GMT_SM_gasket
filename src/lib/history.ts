import type { InspectionResult } from './types'

const KEY = 'gasket-history'
const MAX_ITEMS = 800

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
  const sorted = [...items].sort((a, b) => b.timestamp - a.timestamp)
  localStorage.setItem(KEY, JSON.stringify(sorted.slice(0, MAX_ITEMS)))
}

/** 전체 검사 이력 (최신순) */
export function listHistory(): InspectionResult[] {
  return readAll().sort((a, b) => b.timestamp - a.timestamp)
}

export function getInspection(id: string): InspectionResult | null {
  return readAll().find((r) => r.id === id) ?? null
}

export function saveInspection(r: InspectionResult) {
  writeAll([r, ...readAll()])
}

/** 여러 건 일괄 삽입 (시연용 데이터 시딩 등) */
export function bulkInsert(records: InspectionResult[]) {
  writeAll([...readAll(), ...records])
}

export function updateMemo(id: string, memo: string) {
  const all = readAll()
  const idx = all.findIndex((r) => r.id === id)
  if (idx === -1) return
  all[idx].memo = memo
  writeAll(all)
}

/** 검사 기록의 일부 필드를 부분 갱신 (verdict 수정·defects 체크 등) */
export function updateRecord(id: string, patch: Partial<InspectionResult>) {
  const all = readAll()
  const idx = all.findIndex((r) => r.id === id)
  if (idx === -1) return
  all[idx] = { ...all[idx], ...patch }
  writeAll(all)
}

export function deleteInspection(id: string) {
  writeAll(readAll().filter((r) => r.id !== id))
}

/** 시연용(demo) 데이터만 제거 — 실제 검사 기록은 유지 */
export function removeDemoRecords() {
  writeAll(readAll().filter((r) => !r.demo))
}
