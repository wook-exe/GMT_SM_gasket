import { useState } from 'react'
import { Link } from 'react-router-dom'
import ImageDropzone from '../components/ImageDropzone'
import VerdictBadge from '../components/VerdictBadge'
import { inferGasket, fileToThumbnail, type InferResponse } from '../lib/inference'
import { saveInspection } from '../lib/history'
import { getCurrentUser } from '../lib/auth'
import { getReference } from '../lib/reference'
import type { InspectionResult } from '../lib/types'
import { PRODUCTS } from '../lib/types'

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export default function Inspect() {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [filename, setFilename] = useState<string>('')
  const [result, setResult] = useState<InferResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const reference = getReference()

  const onFile = async (file: File) => {
    setLoading(true)
    setError(null)
    setResult(null)
    setFilename(file.name)
    try {
      const thumb = await fileToThumbnail(file)
      setPreview(thumb)
      const r = await inferGasket(file)
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
      }
      saveInspection(rec)
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setPreview(null)
    setResult(null)
    setError(null)
    setFilename('')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">단건 검사</h1>
        <p className="text-sm text-slate-600 mt-1">
          가스켓 이미지를 업로드하면 자동으로 판정하고 이력에 저장합니다.
        </p>
      </header>

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
                    <span
                      className={`text-xs ${
                        result.source === 'mock'
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {result.source === 'mock'
                        ? '⚠ mock 추론'
                        : '✓ 모델 추론'}
                    </span>
                  </div>
                  <dl className="space-y-2 text-sm bg-slate-50 rounded-md p-4 ring-1 ring-slate-200">
                    <div className="flex justify-between">
                      <dt className="text-slate-600">mask_max</dt>
                      <dd className="font-mono font-semibold text-slate-900">
                        {result.maskMax.toFixed(2)}
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
