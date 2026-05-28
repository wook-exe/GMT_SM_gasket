import { listHistory } from './history'
import { computeDayStats, computeOverallStats, startOfToday } from './stats'
import type { InspectionResult } from './types'

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

function fmtTime(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 챗봇용 통계 요약 — system prompt에 삽입할 컨텍스트 */
export function buildStatsContext(): string {
  const records = listHistory()
  const day = computeDayStats(records)
  const overall = computeOverallStats(records)
  const todayRecords = records.filter((r) => r.timestamp >= startOfToday())
  const todayGasket = gasketBreakdown(todayRecords)
  const totalGasket = gasketBreakdown(records)
  const todaySource = sourceBreakdown(todayRecords)
  const recentFail = records.find((r) => r.verdict === 'FAIL')
  const latest = records[0]

  const lines: string[] = []
  lines.push(`[현재 시각] ${fmtTime(Date.now())}`)
  lines.push('')
  lines.push('[오늘 검사 통계]')
  lines.push(`- 총 검사 수: ${day.inspected}건`)
  lines.push(`- PASS(양품): ${day.pass}건`)
  lines.push(`- FAIL(불량): ${day.fail}건`)
  lines.push(`- 불량률: ${day.defectRate.toFixed(1)}%`)
  lines.push(`- 생산 대기 물량: ${day.production - day.inspected}건`)
  lines.push(`- OPEN 가스켓: ${todayGasket.open}건 / CLOSE 가스켓: ${todayGasket.close}건${todayGasket.unknown ? ` / 미지정: ${todayGasket.unknown}건` : ''}`)
  if (todaySource.gemini + todaySource.claude + todaySource.api + todaySource.mock > 0) {
    const parts: string[] = []
    if (todaySource.gemini) parts.push(`Gemini ${todaySource.gemini}건`)
    if (todaySource.claude) parts.push(`Claude ${todaySource.claude}건`)
    if (todaySource.api) parts.push(`실모델 ${todaySource.api}건`)
    if (todaySource.mock) parts.push(`mock ${todaySource.mock}건`)
    lines.push(`- 추론 소스: ${parts.join(' / ')}`)
  }
  lines.push('')
  lines.push('[전체 누적 통계]')
  lines.push(`- 총 검사: ${overall.total}건`)
  lines.push(`- PASS: ${overall.pass}건 / FAIL: ${overall.fail}건`)
  lines.push(`- 누적 불량률: ${overall.defectRate.toFixed(1)}%`)
  lines.push(`- OPEN ${totalGasket.open}건 / CLOSE ${totalGasket.close}건`)

  if (latest) {
    lines.push('')
    lines.push('[가장 최근 검사]')
    lines.push(`- 시각: ${fmtTime(latest.timestamp)}`)
    lines.push(`- 결과: ${latest.verdict}`)
    lines.push(`- 가스켓 종류: ${latest.gasketType ?? '미지정'}`)
    lines.push(`- mask_max: ${latest.maskMax.toFixed(2)} (threshold ${latest.threshold})`)
    if (latest.summary) lines.push(`- 요약: ${latest.summary}`)
  }

  if (recentFail) {
    lines.push('')
    lines.push('[가장 최근 FAIL 검사]')
    lines.push(`- 시각: ${fmtTime(recentFail.timestamp)}`)
    lines.push(`- 가스켓 종류: ${recentFail.gasketType ?? '미지정'}`)
    if (recentFail.defects && recentFail.defects.length > 0) {
      lines.push(`- 불량 유형: ${recentFail.defects.join(', ')}`)
    }
    if (recentFail.summary) lines.push(`- 요약: ${recentFail.summary}`)
  }

  return lines.join('\n')
}

const SYSTEM_INSTRUCTION = `
너는 냉장고 가스켓 품질 검사 시스템의 챗봇 어시스턴트야.
사용자가 자연어로 묻는 검사 현황 질문에 아래 [통계 컨텍스트]를 근거로 정확하고 간결하게 답해.

답변 규칙:
- 1~3문장으로 짧게 답한다.
- 숫자는 "오늘 총 12건 검사했습니다." 같은 자연스러운 한국어로 답한다.
- 컨텍스트에 없는 정보는 추측하지 말고 "아직 해당 데이터가 없습니다"라고 솔직히 답한다.
- 인사·잡담에는 친근하게 짧게 답하되, 바로 도울 수 있는 검사 통계 예시를 한 줄 알려준다.
- 마크다운 표/리스트는 사용하지 말고 일반 문장으로만 답한다.
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
  for (const m of history.slice(-8)) {
    contents.push({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    })
  }
  contents.push({
    role: 'user',
    parts: [{ text: trimmed }],
  })

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: `${SYSTEM_INSTRUCTION}\n\n[통계 컨텍스트]\n${context}` }],
        },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}) as { error?: { message?: string } })
      throw new Error(err?.error?.message || `Gemini chat 오류 (HTTP ${res.status})`)
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
  const ctx = buildStatsContext()
  const lc = q.toLowerCase()
  const records = listHistory()
  const day = computeDayStats(records)
  const overall = computeOverallStats(records)

  const hasToday = /오늘|today/.test(lc)
  const hasFail = /불량|fail|실패/.test(lc)
  const hasPass = /양품|pass|통과|정상/.test(lc)
  const hasCount = /몇|개수|수|얼마|총|건수|건/.test(lc)
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
  return `Gemini API 키가 설정되지 않아 자동응답으로 안내드립니다.\n\n${ctx}\n\n예시 질문: "오늘 검사 몇 개야?", "오늘 불량 몇 개?", "누적 불량률은?"`
}
