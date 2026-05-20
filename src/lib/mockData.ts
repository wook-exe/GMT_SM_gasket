// ─────────────────────────────────────────────────────────────────
// 시연용(데모) 데이터 생성 모듈
//
// 실제 데이터가 없어도 대시보드가 정상 동작하는 것처럼 보이도록
// 검사 이력 샘플을 자동 생성한다. 실제 API 연동 시에는 이 모듈을
// 호출하지 않고 백엔드에서 받은 데이터를 history 에 적재하면 된다.
// (inference.ts 의 API/mock 분리와 동일한 원칙)
// ─────────────────────────────────────────────────────────────────
import type { InspectionResult, Verdict } from './types'
import { DEFECT_TYPES } from './types'
import { THRESHOLD } from './inference'
import { bulkInsert, listHistory, removeDemoRecords } from './history'

const SEED_FLAG = 'gasket-demo-seeded'
const DEMO_COUNT = 100
const DEMO_WINDOW_MS = 8 * 60 * 60 * 1000 // 최근 8시간(한 교대) 분포
const FAIL_RATE = 0.08 // 불량률 약 8%

const PRODUCTS = [
  '냉장고 도어 가스켓 RT-A24',
  '냉장고 도어 가스켓 RT-B30',
  '냉장고 도어 가스켓 RS-C18',
  '김치냉장고 가스켓 KZ-D12',
]
const INSPECTORS = ['김현수', '이정민', '박서연', '최동욱']

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function round2(n: number) {
  return Math.round(n * 100) / 100
}

function generateRecords(count: number): InspectionResult[] {
  const now = Date.now()
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const windowStart = Math.max(startOfToday.getTime(), now - DEMO_WINDOW_MS)
  const span = Math.max(1, now - windowStart)

  const records: InspectionResult[] = []
  for (let i = 0; i < count; i++) {
    // 시간 흐름순 균등 분포 + 약간의 흔들림
    const jitter = rand(-0.4, 0.4) * (span / count)
    const timestamp = Math.round(windowStart + (span * i) / count + jitter)
    const isFail = Math.random() < FAIL_RATE
    const verdict: Verdict = isFail ? 'FAIL' : 'PASS'
    const maskMax = isFail ? rand(THRESHOLD + 0.5, 86) : rand(4, THRESHOLD - 2)
    const d = new Date(timestamp)
    const stamp =
      d.getFullYear().toString() +
      (d.getMonth() + 1).toString().padStart(2, '0') +
      d.getDate().toString().padStart(2, '0')

    records.push({
      id: `DEMO-${(i + 1).toString().padStart(4, '0')}`,
      productName: pick(PRODUCTS),
      filename: `IMG_${stamp}_${(1000 + i).toString()}.jpg`,
      verdict,
      maskMax: round2(maskMax),
      threshold: THRESHOLD,
      timestamp,
      user: pick(INSPECTORS),
      defectType: isFail ? pick(DEFECT_TYPES) : undefined,
      source: 'mock',
      demo: true,
    })
  }
  return records
}

/** 앱 최초 진입 시 1회 호출 — 데모 데이터가 없으면 시딩한다. */
export function ensureDemoData() {
  if (localStorage.getItem(SEED_FLAG)) return
  bulkInsert(generateRecords(DEMO_COUNT))
  localStorage.setItem(SEED_FLAG, '1')
}

/** 데모 데이터를 새로 생성 (기존 데모 데이터는 교체, 실제 검사 기록은 보존) */
export function regenerateDemoData() {
  removeDemoRecords()
  bulkInsert(generateRecords(DEMO_COUNT))
  localStorage.setItem(SEED_FLAG, '1')
}

/** 데모 데이터 보유 여부 */
export function hasDemoData(): boolean {
  return listHistory().some((r) => r.demo)
}
