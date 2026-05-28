import type { GasketType, Verdict } from './types'

export const THRESHOLD = 46.45
/** CLOSE 가스켓 EfficientNet-B3 임계값 (예측 확률) */
export const CLOSE_THRESHOLD = 0.03

export interface InferResponse {
  verdict: Verdict
  /** OPEN 점수(0~100, PatchCore mask_max) — Vision 분기에서는 score×100으로 채워짐 */
  maskMax: number
  threshold: number
  heatmapDataUrl?: string
  source: 'api' | 'claude' | 'gemini' | 'mock'
  /** Vision 모델이 반환한 0~1 점수 (CLOSE 가스켓 확률) */
  score?: number
  /** 신뢰도 (0~100) */
  confidence?: number
  /** 불량 유형 목록 */
  defects?: string[]
  /** 불량 위치 설명 */
  locations?: string[]
  /** 한국어 판정 요약 */
  summary?: string
  /** 선택된 가스켓 종류 (호출자가 지정) */
  gasketType?: GasketType
}

const API_URL = import.meta.env.VITE_API_URL as string | undefined
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const GEMINI_MODEL = 'gemini-2.0-flash'

const SYSTEM_PROMPT_OPEN = `
너는 냉장고 도어 가스켓 품질 검사 전문 AI야.
OPEN 상태(도어 열린 상태)에서 촬영한 가스켓 이미지를 분석해.
가스켓은 흰색 문 안쪽의 회색 사각형 고무 프레임이야.

판정 기준:
- PASS: 가스켓이 홈에 균일하게 삽입되어 있고 들뜸·오염·미삽입·파손 없음
- FAIL: 미삽입(가스켓 없음), 들뜸(홈 이탈), 오염(이물질), 파손 중 하나라도 있으면

반드시 JSON만 출력. 코드블록·설명 절대 없이:
{
  "verdict": "PASS" or "FAIL",
  "confidence": 0~100 정수,
  "score": 0.0~1.0 소수점 4자리,
  "defects": ["불량 유형들, 없으면 빈 배열"],
  "locations": ["불량 위치 설명들, 없으면 빈 배열"],
  "summary": "한국어 판정 이유 2~3문장"
}
`.trim()

const SYSTEM_PROMPT_CLOSE = `
너는 냉장고 도어 가스켓 품질 검사 전문 AI야.
CLOSE 상태(도어 닫힌 상태)에서 촬영한 가스켓 이미지를 분석해.
결함 유형 3가지:
- Blob: 어두운 타원형 찍힘 또는 파임 (미세 점 형태)
- Scratch: 가는 선 형태의 긁힘
- Wrinkle: 물결 형태의 구겨짐

판정 기준:
- PASS: 가스켓 표면이 균일하고 위 결함 없음
- FAIL: Blob / Scratch / Wrinkle 중 하나라도 발견되면

반드시 JSON만 출력. 코드블록·설명 절대 없이:
{
  "verdict": "PASS" or "FAIL",
  "confidence": 0~100 정수,
  "score": 0.0~1.0 소수점 4자리,
  "defects": ["Blob" | "Scratch" | "Wrinkle" 해당 항목만, 없으면 빈 배열],
  "locations": ["불량 위치 설명들, 없으면 빈 배열"],
  "summary": "한국어 판정 이유 2~3문장"
}
`.trim()

interface VisionRaw {
  verdict?: string
  confidence?: number
  score?: number
  defects?: string[]
  locations?: string[]
  summary?: string
}

function normalizeVisionResult(
  parsed: VisionRaw,
  gasketType: GasketType,
  source: 'claude' | 'gemini',
): InferResponse {
  const verdict: Verdict = parsed.verdict === 'FAIL' ? 'FAIL' : 'PASS'
  const score = typeof parsed.score === 'number' ? parsed.score : verdict === 'FAIL' ? 0.8 : 0.1
  const maskMax = Math.round(score * 10000) / 100
  const threshold = gasketType === 'CLOSE' ? CLOSE_THRESHOLD * 100 : THRESHOLD
  return {
    verdict,
    maskMax,
    threshold,
    source,
    score,
    confidence:
      typeof parsed.confidence === 'number'
        ? parsed.confidence
        : verdict === 'FAIL'
          ? 75
          : 90,
    defects: Array.isArray(parsed.defects) ? parsed.defects : [],
    locations: Array.isArray(parsed.locations) ? parsed.locations : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    gasketType,
  }
}

function parseFailFallback(gasketType: GasketType, source: 'claude' | 'gemini'): InferResponse {
  return {
    verdict: 'FAIL',
    maskMax: 50,
    threshold: gasketType === 'CLOSE' ? CLOSE_THRESHOLD * 100 : THRESHOLD,
    source,
    score: 0.5,
    confidence: 50,
    defects: [],
    locations: [],
    summary: '분석 결과를 파싱하는 데 실패했습니다. 이미지를 다시 업로드해주세요.',
    gasketType,
  }
}

async function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const dataUrl = reader.result as string
      const [meta, body] = dataUrl.split(',', 2)
      const m = /data:([^;]+);base64/.exec(meta)
      const mediaType = m?.[1] ?? file.type ?? 'image/jpeg'
      resolve({ base64: body ?? '', mediaType })
    }
    reader.readAsDataURL(file)
  })
}

async function callClaudeVision(
  file: File,
  gasketType: GasketType,
): Promise<InferResponse> {
  const apiKey = ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 미설정')

  const { base64, mediaType } = await fileToBase64(file)
  const systemPrompt = gasketType === 'CLOSE' ? SYSTEM_PROMPT_CLOSE : SYSTEM_PROMPT_OPEN

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: `이 ${gasketType} 가스켓 이미지를 분석해서 불량 여부를 판정해줘.`,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}) as { error?: { message?: string } })
    throw new Error(err?.error?.message || `Claude API 오류 (HTTP ${response.status})`)
  }

  const data = (await response.json()) as { content?: Array<{ text?: string }> }
  const raw = data.content?.[0]?.text ?? '{}'
  const clean = raw.replace(/```json|```/g, '').trim()

  try {
    return normalizeVisionResult(JSON.parse(clean) as VisionRaw, gasketType, 'claude')
  } catch {
    return parseFailFallback(gasketType, 'claude')
  }
}

async function callGeminiVision(
  file: File,
  gasketType: GasketType,
): Promise<InferResponse> {
  const apiKey = GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY 미설정')

  const { base64, mediaType } = await fileToBase64(file)
  const systemPrompt = gasketType === 'CLOSE' ? SYSTEM_PROMPT_CLOSE : SYSTEM_PROMPT_OPEN

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [
        {
          role: 'user',
          parts: [
            { inline_data: { mime_type: mediaType, data: base64 } },
            { text: `이 ${gasketType} 가스켓 이미지를 분석해서 불량 여부를 판정해줘.` },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}) as { error?: { message?: string } })
    throw new Error(err?.error?.message || `Gemini API 오류 (HTTP ${response.status})`)
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  const clean = raw.replace(/```json|```/g, '').trim()

  try {
    return normalizeVisionResult(JSON.parse(clean) as VisionRaw, gasketType, 'gemini')
  } catch {
    return parseFailFallback(gasketType, 'gemini')
  }
}

export async function inferGasket(
  file: File,
  gasketType: GasketType = 'OPEN',
): Promise<InferResponse> {
  // 1순위: Colab FastAPI
  if (API_URL && API_URL.length > 0) {
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch(`${API_URL.replace(/\/$/, '')}/infer`, {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const j = (await res.json()) as {
        verdict: string
        mask_max: number
        threshold?: number
        heatmap_base64?: string
      }
      return {
        verdict: j.verdict === 'FAIL' ? 'FAIL' : 'PASS',
        maskMax: j.mask_max,
        threshold: j.threshold ?? THRESHOLD,
        heatmapDataUrl: j.heatmap_base64
          ? `data:image/png;base64,${j.heatmap_base64}`
          : undefined,
        source: 'api',
        gasketType,
      }
    } catch (e) {
      console.warn('[inference] Colab API 호출 실패, 다음 단계로 fallback:', e)
    }
  }

  // 2순위: Gemini Vision API (무료 티어)
  if (GEMINI_API_KEY && GEMINI_API_KEY.length > 0) {
    try {
      return await callGeminiVision(file, gasketType)
    } catch (e) {
      console.warn('[inference] Gemini Vision 호출 실패, 다음 단계로 fallback:', e)
    }
  }

  // 3순위: Claude Vision API
  if (ANTHROPIC_API_KEY && ANTHROPIC_API_KEY.length > 0) {
    try {
      return await callClaudeVision(file, gasketType)
    } catch (e) {
      console.warn('[inference] Claude Vision 호출 실패, mock으로 fallback:', e)
    }
  }

  // 4순위: mock
  return mockInfer(file, gasketType)
}

async function mockInfer(file: File, gasketType: GasketType): Promise<InferResponse> {
  const buf = await file.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buf)
  const view = new DataView(hash)
  // 파일 해시 기반 결정론적 점수 (0~100). 같은 파일은 항상 같은 결과.
  const score = (view.getUint32(0) % 10000) / 100

  await new Promise((r) => setTimeout(r, 350))

  return {
    verdict: score >= THRESHOLD ? 'FAIL' : 'PASS',
    maskMax: score,
    threshold: THRESHOLD,
    source: 'mock',
    gasketType,
  }
}

export async function fileToThumbnail(file: File, maxSize = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('이미지 디코드 실패'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('canvas 컨텍스트 생성 실패'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.78))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
