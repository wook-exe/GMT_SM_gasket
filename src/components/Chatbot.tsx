import { useEffect, useRef, useState } from 'react'
import { askChatbot, type ChatMessage } from '../lib/chatbot'
import {
  isSpeechRecognitionSupported,
  isTtsSupported,
  speak,
  startSpeechRecognition,
  stopSpeaking,
  type SpeechController,
} from '../lib/speech'

const QUICK_PROMPTS = [
  '오늘 검사 현황 요약',
  '오늘 불량 유형별 알려줘',
  '들뜸 불량 몇 건?',
  '파손은 몇 건이야?',
  '최근 7일 검사 추이',
  'OPEN 가스켓 불량률은?',
  '최근 불량 5건 보여줘',
  'AI랑 다르게 판정한 건?',
]

const WELCOME: ChatMessage = {
  role: 'assistant',
  text:
    '안녕하세요! 검사 현황을 도와드리는 챗봇입니다.\n\n' +
    '"오늘 들뜸 몇 건이야?", "최근 7일 검사 추이", "OPEN 가스켓 불량률은?" 같은 다양한 질문에 답할 수 있어요. ' +
    '아래 빠른 질문을 눌러보거나, 마이크 버튼으로 음성으로도 물어보실 수 있습니다.',
  ts: Date.now(),
}

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const recRef = useRef<SpeechController | null>(null)

  const sttSupported = isSpeechRecognitionSupported()
  const ttsSupported = isTtsSupported()

  useEffect(() => {
    if (!open) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open, interim])

  useEffect(() => {
    return () => {
      recRef.current?.stop()
      stopSpeaking()
    }
  }, [])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setError(null)
    const userMsg: ChatMessage = { role: 'user', text: trimmed, ts: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const answer = await askChatbot(messages, trimmed)
      const reply: ChatMessage = { role: 'assistant', text: answer, ts: Date.now() }
      setMessages((prev) => [...prev, reply])
      if (ttsEnabled) speak(answer)
    } catch (e) {
      setError(e instanceof Error ? e.message : '응답 생성 중 오류')
    } finally {
      setLoading(false)
    }
  }

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop()
      setListening(false)
      return
    }
    setError(null)
    setInterim('')
    const ctrl = startSpeechRecognition({
      onInterim: (t) => setInterim(t),
      onResult: (t) => {
        setInterim('')
        void send(t)
      },
      onError: (msg) => {
        setError(msg)
        setListening(false)
        setInterim('')
      },
      onEnd: () => {
        setListening(false)
        setInterim('')
      },
    })
    if (ctrl) {
      recRef.current = ctrl
      setListening(true)
    }
  }

  const onToggleTts = () => {
    if (ttsEnabled) stopSpeaking()
    setTtsEnabled((v) => !v)
  }

  const clearChat = () => {
    setMessages([WELCOME])
    setError(null)
    stopSpeaking()
  }

  return (
    <>
      {/* 플로팅 버튼 */}
      {!open && (
        <button
          type="button"
          aria-label="챗봇 열기"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-30 w-14 h-14 rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-800 transition flex items-center justify-center"
        >
          <ChatIcon />
        </button>
      )}

      {/* 채팅 패널 */}
      {open && (
        <div className="fixed bottom-5 right-5 z-30 w-[360px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-2rem)] bg-white rounded-lg shadow-xl ring-1 ring-slate-200 border border-slate-200 flex flex-col overflow-hidden">
          <header className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h2 className="text-sm font-semibold text-slate-900">검사 챗봇</h2>
            </div>
            <div className="flex items-center gap-1">
              {ttsSupported && (
                <button
                  type="button"
                  onClick={onToggleTts}
                  aria-label="음성 답변 토글"
                  title={ttsEnabled ? '음성 답변 끄기' : '음성 답변 켜기'}
                  className={`w-7 h-7 rounded flex items-center justify-center text-xs transition ${
                    ttsEnabled
                      ? 'bg-cyan-100 text-cyan-700'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {ttsEnabled ? '🔊' : '🔇'}
                </button>
              )}
              <button
                type="button"
                onClick={clearChat}
                aria-label="대화 초기화"
                title="대화 초기화"
                className="w-7 h-7 rounded flex items-center justify-center text-xs text-slate-500 hover:bg-slate-100 transition"
              >
                ↻
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="챗봇 닫기"
                className="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>
          </header>

          {/* 메시지 영역 */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-white">
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} text={m.text} />
            ))}
            {interim && (
              <Bubble role="user" text={interim} faded />
            )}
            {loading && <TypingIndicator />}
            {error && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}
          </div>

          {/* 빠른 질문 — 항상 표시 (가로 스크롤) */}
          <div className="px-3 pt-2 pb-1 border-t border-slate-100 flex gap-1.5 overflow-x-auto scrollbar-thin">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={loading}
                onClick={() => void send(q)}
                className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition disabled:opacity-50 whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>

          {/* 입력 영역 */}
          <form
            className="p-3 border-t border-slate-200 flex items-center gap-2 bg-white"
            onSubmit={(e) => {
              e.preventDefault()
              void send(input)
            }}
          >
            {sttSupported && (
              <button
                type="button"
                onClick={toggleMic}
                disabled={loading}
                aria-label={listening ? '음성 입력 중지' : '음성 입력 시작'}
                className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition ${
                  listening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                } disabled:opacity-50`}
              >
                <MicIcon />
              </button>
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? '듣고 있어요...' : '검사 현황을 물어보세요'}
              disabled={loading}
              className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-3 py-2 bg-slate-900 text-white text-sm rounded-md hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              전송
            </button>
          </form>
        </div>
      )}
    </>
  )
}

function Bubble({
  role,
  text,
  faded,
}: {
  role: 'user' | 'assistant'
  text: string
  faded?: boolean
}) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap leading-relaxed ${
          isUser
            ? 'bg-slate-900 text-white rounded-br-sm'
            : 'bg-slate-100 text-slate-800 rounded-bl-sm'
        } ${faded ? 'opacity-60 italic' : ''}`}
      >
        {text}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-slate-100 text-slate-500 px-3 py-2 rounded-lg rounded-bl-sm">
        <span className="inline-flex gap-1">
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
        </span>
      </div>
    </div>
  )
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  )
}
