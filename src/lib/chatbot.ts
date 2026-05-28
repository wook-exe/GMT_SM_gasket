import { listHistory } from './history'
import { computeDayStats, computeOverallStats, startOfToday } from './stats'
import { DEFECT_TYPES, type InspectionResult } from './types'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const GEMINI_MODEL = 'gemini-2.0-flash'

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  ts: number
}

interface GasketBreakdown {
  open: number
  close: number
  unknown: number
}

interface SourceBreakdown {
  api: number
  claude: number
  gemini: number
  mock: number
}

interface DefectCount {
  type: string
  count: number
  isCustom: boolean
}

function gasketBreakdown(records: InspectionResult[]): GasketBreakdown {
  const b: GasketBreakdown = { open: 0, close: 0, unknown: 0 }
  for (const r of records) {
    if (r.gasketType === 'OPEN') b.open += 1
    else if (r.gasketType === 'CLOSE') b.close += 1
    else b.unknown += 1
  }
  return b
}

function sourceBreakdown(records: InspectionResult[]): SourceBreakdown {
  const b: SourceBreakdown = { api: 0, claude: 0, gemini: 0, mock: 0 }
  for (const r of records) {
    b[r.source] = (b[r.source] ?? 0) + 1
  }
  return b
}

/**
 * FAIL 기록에서 불량 유형별 건수 집계.
 * - `defects` 배열 우선, 없으면 `defectType` 사용, 둘 다 없으면 "분류 안 됨".
 * - 표준 8종(DEFECT_TYPES) 순서로 먼저 나오고, 그 뒤에 사용자 직접 입력한 "기타" 항목들이 따라옴.
 */
function defectTypeBreakdown(records: InspectionResult[]): DefectCount[] {
  const counter = new Map<string, number>()
  for (const r of records) {
    if (r.verdict !== 'FAIL') continue
    const tags: string[] = []
    if (r.defects && r.defects.length > 0) tags.push(...r.defects)
    else if (r.defectType) tags.push(r.defectType)
    if (tags.length === 0) {
      counter.set('분류 안 됨', (counter.get('분류 안 됨') ?? 0) + 1)
      continue
    }
    for (const t of tags) counter.set(t, (counter.get(t) ?? 0) + 1)
  }
  const result: DefectCount[] = []
  for (const t of DEFECT_TYPES) {
    result.push({ type: t, count: counter.get(t) ?? 0, isCustom: false })
    counter.delete(t)
  }
  const rest = Array.from(counter.entries()).sort((a, b) => b[1] - a[1])
  for (const [type, count] of rest) {
    result.push({ type, count, isCustom: type !== '분류 안 됨' })
  }
  return result
}

interface DailyBucket {
  date: string
  inspected: number
  fail: number
}

function computeDailyBreakdown(records: InspectionResult[], days: number): DailyBucket[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const result: DailyBucket[] = []
  for (let i = 0; i < days; i++) {
    const start = new Date(today)
    start.setDate(start.getDate() - i)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    const inBucket = records.filter(
      (r) => r.timestamp >= start.getTime() && r.timestamp < end.getTime(),
    )
    const label = i === 0 ? '오늘' : i === 1 ? '어제' : `${start.getMonth() + 1}-${String(start.getDate()).padStart(2, '0')}`
    result.push({
      date: label,
      inspected: inBucket.length,
      fail: inBucket.filter((r) => r.verdict === 'FAIL').length,
    })
  }
  return result
}

interface GasketVerdictStats {
  open: { total: number; fail: number }
  close: { total: number; fail: number }
  unknown: { total: number; fail: number }
}

function computeGasketVerdict(records: InspectionResult[]): GasketVerdictStats {
  const open = records.filter((r) => r.gasketType === 'OPEN')
  const close = records.filter((r) => r.gasketType === 'CLOSE')
  const unknown = records.filter((r) => !r.gasketType)
  const failCount = (arr: InspectionResult[]) => arr.filter((r) => r.verdict === 'FAIL').length
  return {
    open: { total: open.length, fail: failCount(open) },
    close: { total: close.length, fail: failCount(close) },
    unknown: { total: unknown.length, fail: failCount(unknown) },
  }
}

interface UserStat {
  user: string
  total: number
  fail: number
}

function computeUserBreakdown(records: InspectionResult[], top: number): UserStat[] {
  const counter = new Map<string, { total: number; fail: number }>()
  for (const r of records) {
    const u = r.user || 'unknown'
    const cur = counter.get(u) ?? { total: 0, fail: 0 }
    cur.total += 1
    if (r.verdict === 'FAIL') cur.fail += 1
    counter.set(u, cur)
  }
  return Array.from(counter.entries())
    .map(([user, stats]) => ({ user, ...stats }))
    .sort((a, b) => b.total - a.total)
    .slice(0, top)
}

interface ManualEditStats {
  total: number
  passToFail: number
  failToPass: number
}

function computeManualEdits(records: InspectionResult[]): ManualEditStats {
  const manual = records.filter((r) => r.verdictManual)
  const passToFail = manual.filter(
    (r) => r.originalVerdict === 'PASS' && r.verdict === 'FAIL',
  ).length
  const failToPass = manual.filter(
    (r) => r.originalVerdict === 'FAIL' && r.verdict === 'PASS',
  ).length
  return { total: manual.length, passToFail, failToPass }
}

interface ScoreAvg {
  all: number
  pass: number
  fail: number
}

function averageScore(records: InspectionResult[]): ScoreAvg | null {
  if (records.length === 0) return null
  const avg = (arr: InspectionResult[]) =>
    arr.length === 0 ? 0 : arr.reduce((s, r) => s + r.maskMax, 0) / arr.length
  return {
    all: avg(records),
    pass: avg(records.filter((r) => r.verdict === 'PASS')),
    fail: avg(records.filter((r) => r.verdict === 'FAIL')),
  }
}

function fmtTime(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 챗봇용 통계 요약 — system prompt 에 삽입할 컨텍스트 (한국어 자연어 요청 답변용) */
export function buildStatsContext(): string {
  const records = listHistory()
  const day = computeDayStats(records)
  const overall = computeOverallStats(records)
  const todayRecords = records.filter((r) => r.timestamp >= startOfToday())

  const todayGasket = gasketBreakdown(todayRecords)
  const todaySource = sourceBreakdown(todayRecords)
  const todayDefects = defectTypeBreakdown(todayRecords)
  const totalDefects = defectTypeBreakdown(records)
  const dailyBreakdown = computeDailyBreakdown(records, 7)
  const gasketVerdict = computeGasketVerdict(records)
  const userBreakdown = computeUserBreakdown(records, 5)
  const todayAvg = averageScore(todayRecords)
  const overallAvg = averageScore(records)
  const manualEdits = computeManualEdits(records)
  const recentFails = records.filter((r) => r.verdict === 'FAIL').slice(0, 5)
  const latest = records[0]

  const lines: string[] = []
  const pct = (n: number, d: number) =>
    d === 0 ? '0.0' : ((n / d) * 100).toFixed(1)

  lines.push(`[현재 시각] ${fmtTime(Date.now())}`)
  lines.push('')
  lines.push('[오늘 검사 통계]')
  lines.push(`- 총 검사: ${day.inspected}건`)
  lines.push(`- PASS: ${day.pass}건 (${pct(day.pass, day.inspected)}%)`)
  lines.push(`- FAIL: ${day.fail}건 (${day.defectRate.toFixed(1)}%)`)
  lines.push(
    `- OPEN ${todayGasket.open}건 / CLOSE ${todayGasket.close}건` +
      (todayGasket.unknown ? ` / 미지정 ${todayGasket.unknown}건` : ''),
  )
  if (todayAvg) {
    lines.push(
      `- 평균 mask_max: 전체 ${todayAvg.all.toFixed(2)} / PASS ${todayAvg.pass.toFixed(2)} / FAIL ${todayAvg.fail.toFixed(2)}`,
    )
  }

  lines.push('')
  lines.push('[오늘 불량 유형별 분포]')
  if (day.fail === 0) {
    lines.push('- 오늘 불량 없음')
  } else {
    for (const d of todayDefects) {
      if (d.count > 0) {
        lines.push(`- ${d.type}: ${d.count}건${d.isCustom ? ' (기타 직접입력)' : ''}`)
      }
    }
  }

  lines.push('')
  lines.push('[최근 7일 일자별 검사 / 불량]')
  for (const d of dailyBreakdown) {
    lines.push(`- ${d.date}: 검사 ${d.inspected}건, FAIL ${d.fail}건`)
  }

  lines.push('')
  lines.push('[전체 누적 통계]')
  lines.push(`- 총 검사: ${overall.total}건`)
  lines.push(
    `- PASS: ${overall.pass}건 (${pct(overall.pass, overall.total)}%) / FAIL: ${overall.fail}건 (${overall.defectRate.toFixed(1)}%)`,
  )
  if (overallAvg) {
    lines.push(
      `- 평균 mask_max: 전체 ${overallAvg.all.toFixed(2)} / PASS ${overallAvg.pass.toFixed(2)} / FAIL ${overallAvg.fail.toFixed(2)}`,
    )
  }

  lines.push('')
  lines.push('[전체 누적 불량 유형별 분포]')
  if (overall.fail === 0) {
    lines.push('- 누적 불량 없음')
  } else {
    for (const d of totalDefects) {
      if (d.count > 0) {
        lines.push(`- ${d.type}: ${d.count}건${d.isCustom ? ' (기타 직접입력)' : ''}`)
      }
    }
  }

  lines.push('')
  lines.push('[가스켓 종류별 누적 통계]')
  lines.push(
    `- OPEN: ${gasketVerdict.open.total}건, FAIL ${gasketVerdict.open.fail}건 (${pct(gasketVerdict.open.fail, gasketVerdict.open.total)}%)`,
  )
  lines.push(
    `- CLOSE: ${gasketVerdict.close.total}건, FAIL ${gasketVerdict.close.fail}건 (${pct(gasketVerdict.close.fail, gasketVerdict.close.total)}%)`,
  )

  lines.push('')
  lines.push('[오늘 추론 소스별]')
  const totalSources =
    todaySource.gemini + todaySource.claude + todaySource.api + todaySource.mock
  if (totalSources === 0) {
    lines.push('- 오늘 검사 없음')
  } else {
    if (todaySource.gemini) lines.push(`- Gemini Vision: ${todaySource.gemini}건`)
    if (todaySource.claude) lines.push(`- Claude Vision: ${todaySource.claude}건`)
    if (todaySource.api) lines.push(`- 실제 PatchCore 모델: ${todaySource.api}건`)
    if (todaySource.mock) lines.push(`- mock 추론: ${todaySource.mock}건`)
  }

  if (userBreakdown.length > 0) {
    lines.push('')
    lines.push('[검사자별 누적 (상위 5명)]')
    for (const u of userBreakdown) {
      lines.push(`- ${u.user}: ${u.total}건 (FAIL ${u.fail}건)`)
    }
  }

  lines.push('')
  lines.push('[사용자 수정 이력]')
  if (manualEdits.total === 0) {
    lines.push('- AI 자동 판정 그대로 사용 (수정 0건)')
  } else {
    lines.push(`- 총 ${manualEdits.total}건이 사용자에 의해 수정됨`)
    if (manualEdits.passToFail > 0) {
      lines.push(
        `  · PASS → FAIL ${manualEdits.passToFail}건 (AI가 양품으로 판정했지만 사용자가 불량으로 변경)`,
      )
    }
    if (manualEdits.failToPass > 0) {
      lines.push(
        `  · FAIL → PASS ${manualEdits.failToPass}건 (AI가 불량으로 판정했지만 사용자가 양품으로 변경)`,
      )
    }
  }

  if (latest) {
    lines.push('')
    lines.push('[가장 최근 검사]')
    lines.push(
      `- ${fmtTime(latest.timestamp)} | ${latest.gasketType ?? '미지정'} | ${latest.verdict} | mask_max ${latest.maskMax.toFixed(2)}`,
    )
    if (latest.summary) lines.push(`  요약: ${latest.summary}`)
  }

  if (recentFails.length > 0) {
    lines.push('')
    lines.push('[최근 불량 검사 (최대 5건)]')
    for (const r of recentFails) {
      const tags =
        r.defects && r.defects.length > 0
          ? r.defects.join(', ')
          : (r.defectType ?? '분류 안 됨')
      lines.push(
        `- ${fmtTime(r.timestamp)} ${r.gasketType ?? ''} mask_max ${r.maskMax.toFixed(2)} — ${tags}`,
      )
    }
  }

  return lines.join('\n')
}

const SYSTEM_INSTRUCTION = `
너는 냉장고 가스켓 품질 검사 시스템의 챗봇 어시스턴트야.
사용자가 자연어로 묻는 검사 현황 질문에 아래 [통계 컨텍스트] 를 근거로 정확하고 자연스럽게 답해.

답변 규칙:
- 정확한 숫자는 [통계 컨텍스트] 에서 찾아 답한다. 추측·창작 금지.
- 보통은 1~3문장으로 간결하게 답한다. 다만 사용자가 목록·내역을 요청하면 줄바꿈으로 나열해도 된다.
- 숫자는 자연스러운 한국어 문장으로 표현한다. 예: "오늘 총 23건 검사했습니다.", "들뜸 불량은 오늘 1건, 누적 24건입니다."
- 불량 유형 8종(미조립, 들뜸, 변형, 절단, 누수, 오염, 파손, 휨)을 사용자가 물으면 [불량 유형별 분포] 섹션에서 찾아 정확히 답한다. 사용자 직접 입력한 기타 유형도 답할 수 있다.
- 이전 대화 흐름을 활용해 자연스럽게 이어가라. 예: 사용자가 "어제는?" 처럼 짧게 물으면, 직전 질문 주제(예: 불량률)에 대해 어제 데이터로 답한다.
- 컨텍스트에 없는 데이터(예: 다음 주 예측, 라인별 통계)는 "아직 해당 데이터가 없습니다" 라고 솔직히 답한다.
- 인사·잡담에는 친근하게 한 두 문장으로 답하되, 곁들여 예시 질문(예: "오늘 검사 몇 개?" "들뜸 불량 몇 건?") 을 1~2개 안내한다.
- 마크다운 표는 사용하지 말되, 항목이 여러 개일 때 줄바꿈 + 짧은 글머리는 OK.
- "양품" = PASS, "불량" = FAIL, "이상도 점수"/"mask_max" 는 동의어로 취급한다.
- 사용자가 수치 검증이나 계산이 필요한 질문(예: "PASS 율 95% 넘어?")을 하면, 컨텍스트의 숫자로 직접 계산해서 답한다.
`.trim()

interface GeminiPart {
  text: string
}

interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

/**
 * Gemini chat 호출. 대화 기록과 사용자 신규 메시지를 받아 답변 텍스트 반환.
 * API 키가 없으면 로컬 규칙 기반 fallback 사용.
 */
export async function askChatbot(
  history: ChatMessage[],
  userInput: string,
): Promise<string> {
  const context = buildStatsContext()
  const trimmed = userInput.trim()
  if (!trimmed) return '질문을 입력해주세요.'

  if (!GEMINI_API_KEY) {
    return localFallbackAnswer(trimmed)
  }

  const contents: GeminiContent[] = []
  for (const m of history.slice(-10)) {
    contents.push({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    })
  }
  contents.push({ role: 'user', parts: [{ text: trimmed }] })

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            { text: `${SYSTEM_INSTRUCTION}\n\n[통계 컨텍스트]\n${context}` },
          ],
        },
        contents,
        generationConfig: { temperature: 0.5, maxOutputTokens: 1024 },
      }),
    })
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({}) as { error?: { message?: string } })
      throw new Error(
        err?.error?.message || `Gemini chat 오류 (HTTP ${res.status})`,
      )
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!text) return '죄송해요, 답변을 생성하지 못했습니다.'
    return text
  } catch (e) {
    console.warn('[chatbot] Gemini 호출 실패, fallback 사용:', e)
    return localFallbackAnswer(trimmed)
  }
}

/** API 키 없을 때 사용하는 단순 키워드 매칭 fallback. */
function localFallbackAnswer(q: string): string {
  const lc = q.toLowerCase()
  const records = listHistory()
  const day = computeDayStats(records)
  const overall = computeOverallStats(records)
  const todayRecords = records.filter((r) => r.timestamp >= startOfToday())
  const todayDefects = defectTypeBreakdown(todayRecords)
  const totalDefects = defectTypeBreakdown(records)

  // 불량 유형 키워드 매칭
  for (const t of DEFECT_TYPES) {
    if (q.includes(t)) {
      const today = todayDefects.find((d) => d.type === t)?.count ?? 0
      const total = totalDefects.find((d) => d.type === t)?.count ?? 0
      return `${t} 불량은 오늘 ${today}건, 누적 ${total}건입니다.`
    }
  }

  const hasToday = /오늘|today/.test(lc)
  const hasFail = /불량|fail|실패/.test(lc)
  const hasPass = /양품|pass|통과|정상/.test(lc)
  const hasCount = /몇|개수|얼마|총|건수|건/.test(lc)
  const hasRate = /불량률|비율|률/.test(lc)
  const hasTotal = /전체|누적|총|total/.test(lc)

  if (hasToday && hasFail && hasCount) return `오늘 불량은 총 ${day.fail}건 발생했습니다.`
  if (hasToday && hasPass && hasCount) return `오늘 양품은 총 ${day.pass}건입니다.`
  if (hasToday && hasRate) return `오늘 불량률은 ${day.defectRate.toFixed(1)}%입니다.`
  if (hasToday && hasCount) return `오늘 총 ${day.inspected}건 검사했습니다.`
  if (hasTotal && hasFail) return `누적 불량은 ${overall.fail}건입니다.`
  if (hasTotal && hasPass) return `누적 양품은 ${overall.pass}건입니다.`
  if (hasTotal && hasRate) return `누적 불량률은 ${overall.defectRate.toFixed(1)}%입니다.`
  if (hasTotal) return `전체 누적 검사는 ${overall.total}건입니다.`
  if (hasFail) return `오늘 불량은 ${day.fail}건, 누적 ${overall.fail}건입니다.`
  if (hasPass) return `오늘 양품은 ${day.pass}건, 누적 ${overall.pass}건입니다.`
  return `Gemini API 키가 설정되지 않아 정확한 자연어 답변이 어렵습니다.\n\n오늘 검사 ${day.inspected}건 (PASS ${day.pass} / FAIL ${day.fail}), 누적 ${overall.total}건입니다.\n\n예시 질문: "오늘 들뜸 몇 건?", "이번 주 검사 현황", "OPEN 가스켓 불량률은?"`
}
