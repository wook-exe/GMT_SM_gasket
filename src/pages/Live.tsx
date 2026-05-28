import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  inferGasket,
  fileToThumbnail,
} from '../lib/inference'
import { saveInspection } from '../lib/history'
import { getCurrentUser } from '../lib/auth'
import {
  getReference,
  setReference,
  clearReference,
} from '../lib/reference'

const VERSION = 'v0.4.2-poc'
const DEFAULT_LINE = 'LINE-03'
const DEFAULT_LOT = 'LOT-A24-091'
const MODEL_NAME = 'PatchCore-WRN50'
const SCORE_RANGE = 100
const DEFAULT_THRESHOLD = 46.45
const QUEUE_DELAY_MS = 700
const HISTORY_MAX = 100
const CHART_LAST_N = 30
const CYCLE_KEY = 'gasket-cycle-counter'

type Verdict = 'PASS' | 'FAIL'

interface LiveResult {
  id: string
  cycle: number
  lane: 'A' | 'B'
  line: string
  lot: string
  filename: string
  imageDataUrl: string
  heatmapDataUrl?: string
  verdict: Verdict
  score: number
  threshold: number
  timestamp: number
  source: 'api' | 'claude' | 'gemini' | 'mock'
}

function newGsketId(seq: number) {
  return `GSK-${seq.toString().padStart(5, '0')}`
}

function readCycle(): number {
  const raw = localStorage.getItem(CYCLE_KEY)
  const n = raw ? parseInt(raw, 10) : 0
  return Number.isFinite(n) ? n : 0
}

function writeCycle(n: number) {
  localStorage.setItem(CYCLE_KEY, n.toString())
}

function formatTime(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export default function Live() {
  const [line, setLine] = useState(DEFAULT_LINE)
  const [lot, setLot] = useState(DEFAULT_LOT)
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD)
  const [paused, setPaused] = useState(false)
  const [current, setCurrent] = useState<LiveResult | null>(null)
  const [queue, setQueue] = useState<File[]>([])
  const [history, setHistory] = useState<LiveResult[]>([])
  const [now, setNow] = useState(new Date())
  const [processing, setProcessing] = useState(false)
  const processingRef = useRef(false)
  const [cycle, setCycle] = useState(readCycle())
  const seqRef = useRef(cycle)
  const [reference, setReferenceState] = useState<string | null>(getReference())

  // 실시간 시계
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // 큐 처리 — processingRef 가 실제 동시성 가드, processing state 는 UI 표시용
  useEffect(() => {
    if (paused || processingRef.current || queue.length === 0) return
    const file = queue[0]
    processingRef.current = true
    setProcessing(true)
    ;(async () => {
      try {
        const thumb = await fileToThumbnail(file, 480)
        const r = await inferGasket(file)
        seqRef.current += 1
        writeCycle(seqRef.current)
        setCycle(seqRef.current)
        const verdict: Verdict = r.maskMax >= threshold ? 'FAIL' : 'PASS'
        const result: LiveResult = {
          id: newGsketId(seqRef.current),
          cycle: seqRef.current,
          lane: seqRef.current % 2 === 0 ? 'B' : 'A',
          line,
          lot,
          filename: file.name,
          imageDataUrl: thumb,
          heatmapDataUrl: r.heatmapDataUrl,
          verdict,
          score: r.maskMax,
          threshold,
          timestamp: Date.now(),
          source: r.source,
        }
        setCurrent(result)
        setHistory((prev) => [result, ...prev].slice(0, HISTORY_MAX))

        // 전역 이력에도 저장
        const user = getCurrentUser()
        saveInspection({
          id: `${result.id}-${Date.now().toString(36)}`,
          productName: `${line} / ${lot}`,
          filename: result.filename,
          verdict: result.verdict,
          maskMax: result.score,
          threshold: result.threshold,
          timestamp: result.timestamp,
          user: user?.username ?? 'anonymous',
          source: result.source,
        })
      } catch (e) {
        console.error('[Live] 추론 실패:', e)
      } finally {
        setTimeout(() => {
          processingRef.current = false
          setProcessing(false)
          setQueue((prev) => prev.slice(1))
        }, QUEUE_DELAY_MS)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, paused, threshold, line, lot])

  const onAddFiles = (files: FileList | null) => {
    if (!files) return
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'))
    setQueue((prev) => [...prev, ...imgs])
  }

  const onReset = () => {
    if (!confirm('세션 통계·큐·현재 결과를 초기화하고 사이클 카운터를 0으로 되돌립니다. 진행하시겠습니까?')) {
      return
    }
    setCurrent(null)
    setHistory([])
    setQueue([])
    seqRef.current = 0
    writeCycle(0)
    setCycle(0)
  }

  const stats = {
    total: history.length,
    pass: history.filter((r) => r.verdict === 'PASS').length,
    fail: history.filter((r) => r.verdict === 'FAIL').length,
  }
  const failRate = stats.total === 0 ? 0 : (stats.fail / stats.total) * 100

  const scorePct = current ? Math.min(100, (current.score / SCORE_RANGE) * 100) : 0
  const thresholdPct = (threshold / SCORE_RANGE) * 100

  return (
    <div>
      {/* ── 상단 헤더 ─────────────────────────────────────────── */}
      <header className="border border-slate-200 ring-1 ring-slate-200 bg-white rounded-lg p-4 mb-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-cyan-700 font-bold tracking-widest text-sm">PATCHCORE</span>
          <span className="text-slate-300">▸</span>
          <span className="text-cyan-700 font-bold tracking-widest text-sm">GASKET</span>
          <span className="text-slate-700 text-sm ml-3">도어 가스켓 검사 시스템</span>
          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded ml-1">
            {VERSION}
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <Meta
            label="라인"
            value={
              <input
                value={line}
                onChange={(e) => setLine(e.target.value)}
                className="bg-transparent border-b border-slate-300 focus:border-cyan-500 focus:outline-none w-20 text-slate-900 text-sm"
              />
            }
          />
          <Meta
            label="로트"
            value={
              <input
                value={lot}
                onChange={(e) => setLot(e.target.value)}
                className="bg-transparent border-b border-slate-300 focus:border-cyan-500 focus:outline-none w-28 text-slate-900 text-sm"
              />
            }
          />
          <Meta label="모델" value={<span className="text-slate-900">{MODEL_NAME}</span>} />
          <Meta
            label="사이클"
            value={<span className="text-slate-900 font-mono">{cycle.toString().padStart(4, '0')}</span>}
          />
          <Meta
            label="상태"
            value={
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    paused ? 'bg-amber-500' : 'bg-red-500 animate-pulse'
                  }`}
                />
                <span className="text-slate-900">{paused ? '일시정지' : '실시간'}</span>
              </span>
            }
          />
          <Meta
            label="시스템 시간"
            value={<span className="text-slate-900 font-mono">{formatTime(now)}</span>}
          />
        </div>
      </header>

      {/* ── 판정 배너 ─────────────────────────────────────────── */}
      <section
        className={`rounded-lg border-2 p-6 mb-4 transition ${
          current?.verdict === 'PASS'
            ? 'border-emerald-300 bg-emerald-50'
            : current?.verdict === 'FAIL'
              ? 'border-red-300 bg-red-50'
              : 'border-slate-200 bg-slate-50'
        }`}
      >
        {current ? (
          <>
            <div className="flex items-center justify-center gap-5 mb-3">
              <span
                className={`text-5xl ${
                  current.verdict === 'PASS' ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {current.verdict === 'PASS' ? '✓' : '✗'}
              </span>
              <span
                className={`text-5xl font-bold tracking-[0.3em] ${
                  current.verdict === 'PASS' ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {current.verdict === 'PASS' ? '합 격' : '불합격'}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-slate-600 tracking-widest">
              <span>ID {current.id}</span>
              <span className="text-slate-300">·</span>
              <span>LANE {current.lane}</span>
              <span className="text-slate-300">·</span>
              <span>SCORE {current.score.toFixed(4)}</span>
              <span className="text-slate-300">·</span>
              <span>THRESHOLD {current.threshold.toFixed(2)}</span>
              <span className="text-slate-300">·</span>
              <span
                className={current.source === 'mock' ? 'text-amber-600' : 'text-emerald-600'}
              >
                {current.source === 'mock' ? 'MOCK' : 'LIVE'}
              </span>
            </div>
          </>
        ) : (
          <div className="text-center text-slate-500 py-6 text-sm">
            대기 중 — 우측 하단 <span className="text-cyan-700">+ 이미지 추가</span>로 검사를 시작하세요.
          </div>
        )}
      </section>

      {/* ── 메인 그리드 ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* 이미지 패널 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ImagePanel title="원본 영상 · MONO" src={current?.imageDataUrl} />
          <ImagePanel
            title="양품 기준"
            src={reference ?? undefined}
            footnote={!reference ? '우측 사이드바에서 기준 설정' : undefined}
            accent="emerald"
          />
          <ImagePanel
            title="이상 영역 히트맵"
            src={current?.heatmapDataUrl ?? current?.imageDataUrl}
            footnote={
              current && !current.heatmapDataUrl
                ? '히트맵은 백엔드(Cell 7) 연결 시 표시'
                : undefined
            }
          />
        </div>

        {/* 사이드바 */}
        <aside className="space-y-4">
          <Card title="▸ 이상 점수">
            <div className="text-4xl font-bold text-cyan-700 mb-3 font-mono">
              {current ? current.score.toFixed(4) : '——'}
            </div>
            <div className="relative h-2 bg-slate-200 rounded-full overflow-visible">
              <div
                className="absolute top-0 left-0 h-full bg-cyan-500 rounded-full transition-all duration-300"
                style={{ width: `${scorePct}%` }}
              />
              <div
                className="absolute top-[-3px] w-0.5 h-[14px] bg-amber-500"
                style={{ left: `${thresholdPct}%` }}
              >
                <div className="absolute -top-4 -translate-x-1/2 text-[10px] text-amber-600 whitespace-nowrap">
                  T={threshold.toFixed(2)}
                </div>
              </div>
            </div>
          </Card>

          <Card title="▸ 판정 임계값">
            <div className="text-center text-2xl font-bold text-slate-900 mb-2 font-mono">
              {threshold.toFixed(2)}
            </div>
            <input
              type="range"
              min={0}
              max={SCORE_RANGE}
              step={0.05}
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-cyan-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0</span>
              <span>{SCORE_RANGE}</span>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPaused((p) => !p)}
              className="py-2.5 bg-white border border-slate-300 text-slate-700 hover:border-cyan-500 hover:bg-slate-50 rounded text-sm transition"
            >
              {paused ? '▶ 재개' : '⏸ 일시정지'}
            </button>
            <button
              onClick={onReset}
              className="py-2.5 bg-white border border-slate-300 text-slate-700 hover:border-red-400 hover:bg-red-50 rounded text-sm transition"
            >
              ↺ 초기화
            </button>
          </div>

          <Card title="▸ 세션 통계">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="전체 검사 수" value={stats.total} />
              <Stat label="불량" value={stats.fail} color="red" />
              <Stat label="합격" value={stats.pass} color="green" />
              <Stat
                label="불량률"
                value={`${failRate.toFixed(1)}%`}
                color={failRate > 5 ? 'red' : undefined}
              />
            </div>
          </Card>

          <Card title="▸ 점수 추이 (최근 30개)">
            <ScoreChart
              history={history.slice(0, CHART_LAST_N)}
              threshold={threshold}
              range={SCORE_RANGE}
            />
          </Card>

          <Card title="▸ 양품 기준 이미지">
            {reference ? (
              <>
                <div
                  className="aspect-video bg-slate-100 rounded border border-slate-200 overflow-hidden mb-3"
                  style={{
                    backgroundImage: `url(${reference})`,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                />
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        try {
                          const thumb = await fileToThumbnail(f, 480)
                          setReference(thumb)
                          setReferenceState(thumb)
                        } catch (err) {
                          alert(err instanceof Error ? err.message : '실패')
                        }
                      }}
                    />
                    <span className="block text-center py-2 bg-white border border-slate-300 text-slate-700 hover:border-cyan-500 hover:bg-slate-50 rounded text-xs transition">
                      재설정
                    </span>
                  </label>
                  <button
                    onClick={() => {
                      if (!confirm('양품 기준 이미지를 해제합니다.')) return
                      clearReference()
                      setReferenceState(null)
                    }}
                    className="flex-1 py-2 bg-white border border-slate-300 text-slate-700 hover:border-red-400 hover:bg-red-50 rounded text-xs transition"
                  >
                    해제
                  </button>
                </div>
              </>
            ) : (
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    try {
                      const thumb = await fileToThumbnail(f, 480)
                      setReference(thumb)
                      setReferenceState(thumb)
                    } catch (err) {
                      alert(err instanceof Error ? err.message : '실패')
                    }
                  }}
                />
                <span className="block py-3 text-center border border-dashed border-emerald-400 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-700 rounded text-xs transition">
                  + 기준 이미지 업로드
                </span>
              </label>
            )}
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
              검사 화면에 대조용으로 함께 표시됩니다. 한 번 설정하면 모든 페이지에서 공유됩니다.
            </p>
          </Card>

          <Card title="▸ 큐 상태">
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-slate-600">
                대기{' '}
                <span className="font-bold text-cyan-700 text-base">{queue.length}</span>
                <span className="text-slate-400">장</span>
              </span>
              {processing && (
                <span className="text-amber-600 text-xs animate-pulse">처리 중…</span>
              )}
            </div>
            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => onAddFiles(e.target.files)}
              />
              <span className="block py-2.5 text-center border border-dashed border-cyan-400 hover:border-cyan-500 hover:bg-cyan-50 text-cyan-700 rounded text-sm transition">
                + 이미지 추가 (다중 선택 가능)
              </span>
            </label>
          </Card>
        </aside>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] text-slate-500 uppercase tracking-widest">{label}</div>
      <div className="text-sm mt-0.5">{value}</div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 ring-1 ring-slate-200 rounded-lg p-4">
      <div className="text-xs text-cyan-700 mb-3 tracking-widest">{title}</div>
      {children}
    </div>
  )
}

function Stat({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color?: 'red' | 'green'
}) {
  const cls =
    color === 'red'
      ? 'text-red-600'
      : color === 'green'
        ? 'text-emerald-600'
        : 'text-cyan-700'
  return (
    <div className="bg-slate-50 border border-slate-200 rounded p-3">
      <div className={`text-2xl font-bold font-mono ${cls}`}>{value}</div>
      <div className="text-[10px] text-slate-500 mt-1 tracking-wider">{label}</div>
    </div>
  )
}

function ImagePanel({
  title,
  src,
  footnote,
  accent = 'cyan',
}: {
  title: string
  src?: string
  footnote?: string
  accent?: 'cyan' | 'emerald'
}) {
  const titleColor = accent === 'emerald' ? 'text-emerald-700' : 'text-cyan-700'
  const gridColor =
    accent === 'emerald' ? 'rgba(5,150,105,0.06)' : 'rgba(8,145,178,0.06)'
  return (
    <div className="bg-white border border-slate-200 ring-1 ring-slate-200 rounded-lg p-3">
      <div className={`text-xs ${titleColor} mb-2 tracking-widest`}>▸ {title}</div>
      <div
        className="relative aspect-square bg-slate-100 overflow-hidden rounded"
        style={{
          backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      >
        <CornerBracket position="tl" accent={accent} />
        <CornerBracket position="tr" accent={accent} />
        <CornerBracket position="bl" accent={accent} />
        <CornerBracket position="br" accent={accent} />
        {src ? (
          <img
            src={src}
            alt={title}
            className="absolute inset-6 w-[calc(100%-3rem)] h-[calc(100%-3rem)] object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-xs tracking-widest">
            NO SIGNAL
          </div>
        )}
        {footnote && (
          <div className="absolute bottom-2 right-2 text-[10px] text-slate-500 bg-white/90 px-2 py-1 rounded border border-slate-200">
            {footnote}
          </div>
        )}
      </div>
    </div>
  )
}

function CornerBracket({
  position,
  accent = 'cyan',
}: {
  position: 'tl' | 'tr' | 'bl' | 'br'
  accent?: 'cyan' | 'emerald'
}) {
  const cls = {
    tl: 'top-2 left-2 border-t-2 border-l-2',
    tr: 'top-2 right-2 border-t-2 border-r-2',
    bl: 'bottom-2 left-2 border-b-2 border-l-2',
    br: 'bottom-2 right-2 border-b-2 border-r-2',
  }[position]
  const color = accent === 'emerald' ? 'border-emerald-500/50' : 'border-cyan-500/50'
  return (
    <div className={`absolute ${cls} ${color} w-5 h-5 z-10 pointer-events-none`} />
  )
}

function ScoreChart({
  history,
  threshold,
  range,
}: {
  history: LiveResult[]
  threshold: number
  range: number
}) {
  if (history.length === 0) {
    return (
      <div className="text-xs text-slate-400 py-6 text-center tracking-wider">데이터 없음</div>
    )
  }
  const w = 280
  const h = 90
  const pad = 10
  const data = [...history].reverse()
  const max = Math.max(range, ...data.map((d) => d.score))
  const xStep =
    data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0
  const yFor = (v: number) => h - pad - (v / max) * (h - pad * 2)
  const points = data
    .map((d, i) => `${pad + i * xStep},${yFor(d.score)}`)
    .join(' ')
  const tY = yFor(threshold)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {/* threshold line */}
      <line
        x1={pad}
        y1={tY}
        x2={w - pad}
        y2={tY}
        stroke="#f59e0b"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <text x={w - pad} y={tY - 3} textAnchor="end" fontSize="9" fill="#d97706">
        T={threshold.toFixed(2)}
      </text>

      {/* score polyline */}
      {data.length > 1 && (
        <polyline fill="none" stroke="#0891b2" strokeWidth={1.5} points={points} />
      )}

      {/* points */}
      {data.map((d, i) => (
        <circle
          key={d.id}
          cx={pad + i * xStep}
          cy={yFor(d.score)}
          r={2}
          fill={d.verdict === 'FAIL' ? '#ef4444' : '#10b981'}
        />
      ))}
    </svg>
  )
}
