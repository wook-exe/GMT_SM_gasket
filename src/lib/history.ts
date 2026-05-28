import {
  mirrorDelete,
  mirrorInspection,
  pullAllInspections,
} from './firestoreSync'
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
  void mirrorInspection(r)
}

/** 여러 건 일괄 삽입 (시연용 데이터 시딩 등) */
export function bulkInsert(records: InspectionResult[]) {
  writeAll([...readAll(), ...records])
  // 시연용 다량 시딩은 Firestore 미러를 생략 (무료 한도 보호)
  // 필요 시 records.forEach((r) => void mirrorInspection(r)) 로 켤 수 있음
}

export function updateMemo(id: string, memo: string) {
  const all = readAll()
  const idx = all.findIndex((r) => r.id === id)
  if (idx === -1) return
  all[idx].memo = memo
  writeAll(all)
  void mirrorInspection(all[idx])
}

/** 검사 기록의 일부 필드를 부분 갱신 (verdict 수정·defects 체크 등) */
export function updateRecord(id: string, patch: Partial<InspectionResult>) {
  const all = readAll()
  const idx = all.findIndex((r) => r.id === id)
  if (idx === -1) return
  all[idx] = { ...all[idx], ...patch }
  writeAll(all)
  void mirrorInspection(all[idx])
}

export function deleteInspection(id: string) {
  writeAll(readAll().filter((r) => r.id !== id))
  void mirrorDelete(id)
}

/** 시연용(demo) 데이터만 제거 — 실제 검사 기록은 유지 */
export function removeDemoRecords() {
  writeAll(readAll().filter((r) => !r.demo))
}

/**
 * Firestore 에서 모든 검사 이력을 받아와서 로컬과 병합한다.
 * - 같은 id 가 양쪽에 있으면 timestamp 가 큰 쪽 (또는 동일 시 원격) 사용.
 * - imageDataUrl/heatmapDataUrl 은 Firestore 에 저장되지 않으므로, 로컬 캐시에 있던 것은 유지.
 * - Firebase 미설정 시 0 반환.
 * - 반환값: 원격에서 가져온 레코드 개수.
 */
export async function syncFromFirestore(): Promise<number> {
  const remote = await pullAllInspections()
  if (remote.length === 0) return 0
  const local = readAll()
  const merged = new Map<string, InspectionResult>()
  for (const r of local) merged.set(r.id, r)
  for (const r of remote) {
    const existing = merged.get(r.id)
    if (!existing || r.timestamp >= existing.timestamp) {
      // 원격이 더 최신 → 채택. 단 로컬에 썸네일이 있으면 보존.
      merged.set(r.id, {
        ...r,
        imageDataUrl: r.imageDataUrl ?? existing?.imageDataUrl,
        heatmapDataUrl: r.heatmapDataUrl ?? existing?.heatmapDataUrl,
      })
    }
  }
  writeAll(Array.from(merged.values()))
  return remote.length
}
