import type { InspectionResult } from './types'

export function startOfToday(d = new Date()): number {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

/**
 * 오늘의 "생산수량 - 검사수량" 버퍼(검사 대기 물량).
 * 날짜 기준 결정론적 값이라 하루 동안 흔들리지 않는다.
 * TODO: 실제 운영 시 MES/PLC 의 생산 카운터로 대체
 */
export function productionBuffer(d = new Date()): number {
  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  let h = 7
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return 8 + (h % 17) // 8 ~ 24
}

export interface DayStats {
  production: number
  inspected: number
  pass: number
  fail: number
  defectRate: number
}

/** 오늘 기준 집계 */
export function computeDayStats(records: InspectionResult[]): DayStats {
  const since = startOfToday()
  const today = records.filter((r) => r.timestamp >= since)
  const inspected = today.length
  const pass = today.filter((r) => r.verdict === 'PASS').length
  const fail = inspected - pass
  return {
    production: inspected + productionBuffer(),
    inspected,
    pass,
    fail,
    defectRate: inspected === 0 ? 0 : (fail / inspected) * 100,
  }
}

export interface OverallStats {
  total: number
  pass: number
  fail: number
  defectRate: number
}

/** 전체 누적 집계 */
export function computeOverallStats(records: InspectionResult[]): OverallStats {
  const total = records.length
  const pass = records.filter((r) => r.verdict === 'PASS').length
  const fail = total - pass
  return {
    total,
    pass,
    fail,
    defectRate: total === 0 ? 0 : (fail / total) * 100,
  }
}

export interface TrendBucket {
  label: string
  pass: number
  fail: number
  start: number
}

/** 최근 N시간을 1시간 단위 버킷으로 집계 (검사 추이 그래프용) */
export function computeHourlyTrend(
  records: InspectionResult[],
  hours = 8,
): TrendBucket[] {
  const base = new Date()
  base.setMinutes(0, 0, 0)
  const buckets: TrendBucket[] = []
  for (let i = hours - 1; i >= 0; i--) {
    const bs = new Date(base)
    bs.setHours(bs.getHours() - i)
    const start = bs.getTime()
    const end = start + 3_600_000
    const inBucket = records.filter(
      (r) => r.timestamp >= start && r.timestamp < end,
    )
    buckets.push({
      label: `${bs.getHours().toString().padStart(2, '0')}시`,
      pass: inBucket.filter((r) => r.verdict === 'PASS').length,
      fail: inBucket.filter((r) => r.verdict === 'FAIL').length,
      start,
    })
  }
  return buckets
}

/** 불량 유형별 건수 (오늘 기준) */
export function computeDefectBreakdown(
  records: InspectionResult[],
): { type: string; count: number }[] {
  const since = startOfToday()
  const map = new Map<string, number>()
  records
    .filter((r) => r.timestamp >= since && r.verdict === 'FAIL')
    .forEach((r) => {
      const t = r.defectType ?? '미분류'
      map.set(t, (map.get(t) ?? 0) + 1)
    })
  return Array.from(map.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
}
