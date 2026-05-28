/**
 * Web Speech API 래퍼 — 브라우저 내장 음성 인식 / 음성 합성.
 * 외부 의존성 없음, 무료.
 *
 * 음성 인식 지원: Chrome / Edge / Safari (iOS 14.5+). Firefox는 미지원.
 * TTS는 거의 모든 모던 브라우저에서 동작.
 */

interface SpeechRecognitionAlternative {
  transcript: string
}

interface SpeechRecognitionResult {
  isFinal: boolean
  0: SpeechRecognitionAlternative
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent {
  error: string
  message?: string
}

interface ISpeechRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null
}

type RecognitionCtor = new () => ISpeechRecognition

interface SpeechWindow extends Window {
  SpeechRecognition?: RecognitionCtor
  webkitSpeechRecognition?: RecognitionCtor
}

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as SpeechWindow
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isSpeechRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null
}

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export interface SpeechController {
  stop(): void
}

/**
 * 한국어 음성 인식 시작.
 * onResult는 최종 인식 결과 텍스트를 한 번 받는다.
 * onError는 사용자가 보기 좋은 한국어 메시지를 받는다.
 */
export function startSpeechRecognition(opts: {
  onInterim?: (text: string) => void
  onResult: (text: string) => void
  onError?: (msg: string) => void
  onEnd?: () => void
}): SpeechController | null {
  const Ctor = getRecognitionCtor()
  if (!Ctor) {
    opts.onError?.('이 브라우저는 음성 인식을 지원하지 않습니다.')
    return null
  }
  const rec = new Ctor()
  rec.lang = 'ko-KR'
  rec.continuous = false
  rec.interimResults = true

  let finalText = ''
  rec.onresult = (e) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      const t = r[0].transcript
      if (r.isFinal) finalText += t
      else interim += t
    }
    if (interim && opts.onInterim) opts.onInterim(interim)
  }
  rec.onerror = (e) => {
    const map: Record<string, string> = {
      'not-allowed': '마이크 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.',
      'no-speech': '음성이 감지되지 않았습니다.',
      'audio-capture': '마이크를 찾을 수 없습니다.',
      network: '네트워크 오류가 발생했습니다.',
    }
    opts.onError?.(map[e.error] ?? `음성 인식 오류: ${e.error}`)
  }
  rec.onend = () => {
    if (finalText.trim()) opts.onResult(finalText.trim())
    opts.onEnd?.()
  }

  try {
    rec.start()
  } catch (e) {
    opts.onError?.(e instanceof Error ? e.message : '음성 인식을 시작할 수 없습니다.')
    return null
  }

  return {
    stop: () => {
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
    },
  }
}

/** 한국어 TTS로 텍스트 읽어주기. 호출 시 진행 중인 합성은 중단. */
export function speak(text: string): void {
  if (!isTtsSupported() || !text.trim()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ko-KR'
  u.rate = 1.0
  u.pitch = 1.0
  // 한국어 음성 우선 선택
  const voices = synth.getVoices()
  const ko = voices.find((v) => v.lang?.startsWith('ko'))
  if (ko) u.voice = ko
  synth.speak(u)
}

export function stopSpeaking(): void {
  if (isTtsSupported()) window.speechSynthesis.cancel()
}
