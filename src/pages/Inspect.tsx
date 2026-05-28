import { useState } from 'react'
import { Link } from 'react-router-dom'
import ImageDropzone from '../components/ImageDropzone'
import InspectionEditor from '../components/InspectionEditor'
import VerdictBadge from '../components/VerdictBadge'
import { inferGasket, fileToThumbnail, type InferResponse } from '../lib/inference'
import { saveInspection } from '../lib/history'
import { getCurrentUser } from '../lib/auth'
import { getReference } from '../lib/reference'
import type { GasketType, InspectionResult } from '../lib/types'
import { PRODUCTS } from '../lib/types'

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const SOURCE_LABEL: Record<InferResponse['source'], { text: string; cls: string }> = {
  api: { text: '✓ 모델 추론', cls: 'text-emerald-700' },
  claude: { text: '✓ AI 비전 추론 (Claude)', cls: 'text-cyan-700' },
  gemini: { text: '✓ AI 비전 추론 (Gemini)', cls: 'text-blue-700' },
  mock: { text: '⚠ mock 추론', cls: 'text-amber-700' },
}

export default function Inspect() {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [filename, setFilename] = useState<string>('')
  const [result, setResult] = useState<InferResponse | null>(null)
  const [record, setRecord] = useState<InspectionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gasketType, setGasketType] = useState<GasketType>('OPEN')
  const [savedToast, setSavedToast] = useState(false)
  const reference = getReference()

  const onFile = async (file: File) => {
    setLoading(true)
    setError(null)
    setResult(null)
    setRecord(null)
    setFilename(file.name)
    try {
      const thumb = await fileToThumbnail(file)
      setPreview(thumb)
      const r = await inferGasket(file, gasketType)
      setResult(r)

      const user = getCurrentUser()
      const rec: InspectionResult = {
        id: newId(),
        productName: PRODUCTS[0],
        filename: file.name,
        verdict: r.verdict,
        maskMax: r.maskMax,
        threshold: r.threshold,
        timestamp: Date.now(),
        user: user?.username ?? 'anonymous',
        source: r.source,
        gasketType: r.gasketType ?? gasketType,
        confidence: r.confidence,
        defects: r.defects,
        locations: r.locations,
        summary: r.summary,
      }
      saveInspection(rec)
      setRecord(rec)
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setPreview(null)
    setResult(null)
    setRecord(null)
    setError(null)
    setFilename('')
  }

  const onSavedNext = () => {
    setSavedToast(true)
    // 저장 직후 폼이 닫히는 게 보이도록 약간의 시각적 여유를 둠
    setTimeout(() => {
      reset()
    }, 600)
    setTimeout(() => setSavedToast(false), 2500)
  }

  const srcLabel = result ? SOURCE_LABEL[result.source] : null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">단건 검사</h1>
        <p className="text-sm text-slate-600 mt-1">
          가스켓 이미지를 업로드하면 자동으로 판정하고 이력에 저장합니다.
        </p>
      </header>

      {savedToast && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
          <span className="text-emerald-600 text-base">✓</span>
          저장되었습니다. 다음 검사 이미지를 업로드해주세요.
        </div>
      )}

      <GasketTypeToggle
        value={gasketType}
        onChange={setGasketType}
        disabled={loading}
      />

      {!preview ? (
        <ImageDropzone onFile={onFile} disabled={loading} />
      ) : (
        <div className="bg-white ring-1 ring-slate-200 border border-slate-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="bg-slate-100 p-2">
              <img
                src={preview}
                alt={filename}
                className="w-full h-72 object-contain"
              />
            </div>
            <div className="p-6 flex flex-col">
              {loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                  <div className="w-8 h-8 border-2 border-slate-200 border-t-cyan-600 rounded-full animate-spin mb-3" />
                  <span className="text-sm">분석 중...</span>
                </div>
              )}

              {error && !loading && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
                  에러: {error}
                </div>
              )}

              {result && !loading && (
                <>
                  <div className="mb-4 flex items-center gap-2 flex-wrap">
                    <VerdictBadge verdict={result.verdict} size="md" />
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {result.gasketType ?? gasketType}
                    </span>
                    {srcLabel && (
                      <span className={`text-xs ${srcLabel.cls}`}>
                        {srcLabel.text}
                      </span>
                    )}
                  </div>
                  <dl className="space-y-2 text-sm bg-slate-50 rounded-md p-4 ring-1 ring-slate-200">
                    {typeof result.confidence === 'number' && (
                      <div>
                        <div className="flex justify-between mb-1">
                          <dt className="text-slate-600">신뢰도</dt>
                          <dd className="font-mono font-semibold text-slate-900">
                            {result.confidence}%
                          </dd>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${result.verdict === 'FAIL' ? 'bg-red-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.max(0, Math.min(100, result.confidence))}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-slate-600">
                        {result.source === 'claude' || result.source === 'gemini'
                          ? '이상도 점수'
                          : 'mask_max'}
                      </dt>
                      <dd className="font-mono font-semibold text-slate-900">
                        {(result.source === 'claude' || result.source === 'gemini') &&
                        typeof result.score === 'number'
                          ? result.score.toFixed(4)
                          : result.maskMax.toFixed(2)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">threshold</dt>
                      <dd className="font-mono text-slate-700">
                        {result.threshold}
                      </dd>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <dt className="text-slate-600">판정 근거</dt>
                      <dd className="text-xs text-slate-700">
                        {result.maskMax.toFixed(2)}{' '}
                        {result.verdict === 'FAIL' ? '≥' : '<'}{' '}
                        {result.threshold}
                      </dd>
                    </div>
                  </dl>

                  {result.verdict === 'FAIL' && result.defects && result.defects.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs text-slate-600 mb-1.5">불량 유형</div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.defects.map((d, i) => (
                          <span
                            key={`${d}-${i}`}
                            className="text-xs font-medium px-2 py-1 rounded bg-red-50 text-red-700 ring-1 ring-red-200"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.verdict === 'FAIL' && result.locations && result.locations.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs text-slate-600 mb-1.5">불량 위치</div>
                      <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                        {result.locations.map((loc, i) => (
                          <li key={i}>{loc}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.summary && (
                    <div className="mt-4">
                      <div className="text-xs text-slate-600 mb-1.5">판정 요약</div>
                      <p className="text-sm text-slate-700 bg-white ring-1 ring-slate-200 rounded-md p-3 leading-relaxed">
                        {result.summary}
                      </p>
                    </div>
                  )}

                  <div className="mt-auto pt-6 flex gap-2">
                    <button
                      onClick={reset}
                      className="flex-1 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 text-sm font-medium transition"
                    >
                      새 검사
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 검사 결과 편집 — 판정 수정·불량 유형·메모 */}
      {record && result && !loading && (
        <InspectionEditor
          record={record}
          heading="검사 결과 기록 — 판정 수정·불량 유형·메모"
          onSaved={onSavedNext}
        />
      )}

      {/* 양품 기준 비교 패널 */}
      {preview && result && !loading && (
        <section className="bg-white ring-1 ring-slate-200 border border-slate-200 rounded-lg p-5">
          <header className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">양품 기준 비교</h2>
            <Link
              to="/live"
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              기준 이미지 변경 →
            </Link>
          </header>
          {reference ? (
            <div className="grid grid-cols-2 gap-3">
              <Compare
                label="검사 이미지"
                src={preview}
                highlight={result.verdict === 'FAIL' ? 'red' : 'green'}
              />
              <Compare label="양품 기준" src={reference} highlight="muted" />
            </div>
          ) : (
            <div className="text-sm text-slate-600 bg-slate-50 border border-dashed border-slate-300 rounded-md p-6 text-center">
              아직 양품 기준 이미지가 설정되지 않았습니다.
              <br />
              <Link to="/live" className="text-cyan-700 underline hover:no-underline">
                현장 페이지
              </Link>
              에서 한 번 설정하면 모든 검사에서 비교할 수 있습니다.
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function GasketTypeToggle({
  value,
  onChange,
  disabled,
}: {
  value: GasketType
  onChange: (v: GasketType) => void
  disabled?: boolean
}) {
  const info =
    value === 'OPEN'
      ? 'PatchCore · 비지도 이상탐지 · F1 0.822 (mask_max ≥ 46.45 → FAIL)'
      : 'EfficientNet-B3 · 지도학습 · AUROC 0.913 (확률 ≥ 0.03 → FAIL)'

  const base =
    'flex-1 py-2 text-sm font-medium rounded-md transition border'
  const active =
    'bg-slate-900 text-white border-slate-900'
  const inactive =
    'bg-white text-slate-700 border-slate-200 hover:border-slate-400'

  return (
    <section className="bg-white ring-1 ring-slate-200 border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900">가스켓 종류</h2>
        <span className="text-xs text-slate-500">선택한 모델 프롬프트로 분석합니다</span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('OPEN')}
          className={`${base} ${value === 'OPEN' ? active : inactive} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          OPEN (도어 열림)
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('CLOSE')}
          className={`${base} ${value === 'CLOSE' ? active : inactive} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          CLOSE (도어 닫힘)
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">{info}</p>
    </section>
  )
}

function Compare({
  label,
  src,
  highlight,
}: {
  label: string
  src: string
  highlight: 'red' | 'green' | 'muted'
}) {
  const ring =
    highlight === 'red'
      ? 'ring-2 ring-red-500/50'
      : highlight === 'green'
        ? 'ring-2 ring-emerald-500/50'
        : 'ring-1 ring-slate-200'
  const labelCls =
    highlight === 'red'
      ? 'bg-red-50 text-red-700'
      : highlight === 'green'
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-slate-100 text-slate-600'
  return (
    <div className={`rounded-md overflow-hidden ${ring}`}>
      <div className={`text-xs font-medium px-3 py-1.5 ${labelCls}`}>
        {label}
      </div>
      <div className="bg-slate-100 p-1">
        <img
          src={src}
          alt={label}
          className="w-full h-56 object-contain bg-white"
        />
      </div>
    </div>
  )
}
