import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { getDb } from './firebase'
import type { InspectionResult } from './types'

const COLLECTION = 'inspections'

/**
 * Firestore 미러 정책
 * - 모든 saveInspection/updateRecord/updateMemo/deleteInspection 가 호출 시 본 모듈을 통해
 *   `inspections/{record.id}` 문서를 setDoc/deleteDoc 한다.
 * - 호출은 fire-and-forget (await 안 함) — 로컬 동작에 영향 없게.
 * - Firebase 미설정 시 모든 호출은 조용히 no-op.
 *
 * 데이터 모델:
 * - InspectionResult 전체 필드 + `_syncedAt`(serverTimestamp, 디버깅용).
 * - imageDataUrl(썸네일 base64) 은 용량 절감 위해 저장하지 않음 — Firestore 문서 1MB 한도 보호.
 */

function stripHeavyFields(rec: InspectionResult): InspectionResult {
  // base64 이미지는 Firestore 에 저장하지 않음. 로컬 캐시에만 유지.
  const { imageDataUrl: _img, heatmapDataUrl: _heat, ...rest } = rec
  return rest as InspectionResult
}

export async function mirrorInspection(rec: InspectionResult): Promise<void> {
  const db = getDb()
  if (!db) return
  try {
    const stripped = stripHeavyFields(rec)
    await setDoc(doc(db, COLLECTION, rec.id), {
      ...stripped,
      _syncedAt: serverTimestamp(),
    })
  } catch (e) {
    console.warn('[firestore] mirror save 실패:', e)
  }
}

export async function mirrorDelete(id: string): Promise<void> {
  const db = getDb()
  if (!db) return
  try {
    await deleteDoc(doc(db, COLLECTION, id))
  } catch (e) {
    console.warn('[firestore] mirror delete 실패:', e)
  }
}

/**
 * Firestore 의 모든 inspection 문서를 timestamp 내림차순으로 가져온다.
 * Firebase 미설정이거나 오류 시 빈 배열 반환.
 */
export async function pullAllInspections(): Promise<InspectionResult[]> {
  const db = getDb()
  if (!db) return []
  try {
    const q = query(collection(db, COLLECTION), orderBy('timestamp', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => {
      const data = d.data() as InspectionResult & { _syncedAt?: unknown }
      // _syncedAt 필드는 클라이언트에서 사용하지 않으므로 제거
      const { _syncedAt: _ignored, ...clean } = data
      return clean as InspectionResult
    })
  } catch (e) {
    console.warn('[firestore] pullAllInspections 실패:', e)
    return []
  }
}
