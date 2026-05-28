import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { deleteInspection, getInspection, updateRecord } from '../lib/history'
import VerdictBadge from '../components/VerdictBadge'
import { DEFECT_TYPES, type InspectionResult, type Verdict } from '../lib/types'

export default function Detail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [item, setItem] = useState<InspectionResult | null>(null)
  const [memo, setMemo] = useState('')
  const [verdict, setVerdict] = useState<Verdict>('PASS')
  const [checkedDefects, setCheckedDefects] = useState<Set<string>>(new Set())
  const [etcText, setEtcText] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!id) return
    const r = getInspection(id)
    setItem(r)
    if (r) {
      setMemo(r.memo ?? '')
      setVerdict(r.verdict)
      const known = new Set<string>(DEFECT_TYPES as readonly string[])
      const checked = new Set<string>()
      const extras: string[] = []
      for (const d of r.defects ?? []) {
        if (known.has(d)) checked.add(d)
        else extras.push(d)
      }
      // legacy defectType 도 표준 목록에 포함되면 체크
      if (r.defectType) {
        if (known.has(r.defectType)) checked.add(r.defectType)
        else if (!extras.includes(r.defectType)) extras.push(r.defectType)
      }
      setCheckedDefects(checked)
      setEtcText(extras.join(', '))
    }
  }, [id])

  const aiVerdict = useMemo(() => item?.originalVerdict ?? item?.verdict ?? 'PASS', [item])
  const verdictChanged = item ? verdict !== aiVerdict : false

  if (!item) {
    return (
      <div className="text-center py-16 text-slate-500">
        검사 결과를 찾을 수 없습니다.
      </div>
    )
  }

  const toggleDefect = (d: string) => {
    setCheckedDefects((prev) => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d)
      else next.add(d)
      return next
    })
  }

  const onSave = () => {
    const extras = etcText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const defects = [...Array.from(checkedDefects), ...extras]

    updateRecord(item.id, {
      memo: memo.trim(),
      verdict,
      defects,
      // defectType 은 첫 번째 항목으로 대표값 유지 (대시보드/이력 호환)
      defectType: defects[0],
      originalVerdict: item.originalVerdict ?? item.verdict,
      verdictManual: verdict !== (item.originalVerdict ?? item.verdict),
    })

    setItem({
      ...item,
      memo: memo.trim(),
      verdict,
      defects,
      defectType: defects[0],
      originalVerdict: item.originalVerdict ?? item.verdict,
      verdictManual: verdict !== (item.originalVerdict ?? item.verdict),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const onDelete = () => {
    if (!confirm('이 검사 기록을 삭제하시겠습니까?')) return
    deleteInspection(item.id)
    nav('/history')
  }

  const formatTime = (ts: number) => new Date(ts).toLocaleString('ko-KR')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => nav(-1)}
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        ← 뒤로
      </button>

      <div className="bg-white ring-1 ring-slate-200 border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <VerdictBadge verdict={verdict} size="md" />
              {item.verdictManual && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                  사용자 수정
                </span>
              )}
            </div>
            <span className="text-sm text-slate-500">
              {formatTime(item.timestamp)}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 break-all mb-2">
            {item.productName}
          </h2>
          <div className="text-xs text-slate-500">{item.filename}</div>
        </div>

        <div className="p-6 space-y-6">
          {/* 추론 정보 */}
          <dl className="grid grid-cols-2 gap-3 text-sm bg-slate-50 rounded-md p-4 ring-1 ring-slate-200">
            <div>
              <dt className="text-slate-600">mask_max</dt>
              <dd className="font-mono text-slate-900 font-semibold">
                {item.maskMax.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-600">threshold</dt>
              <dd className="font-mono text-slate-700">{item.threshold}</dd>
            </div>
            <div>
              <dt className="text-slate-600">검사자</dt>
              <dd className="text-slate-700">{item.user}</dd>
            </div>
            <div>
              <dt className="text-slate-600">추론 소스</dt>
              <dd className="text-xs">
                {item.source === 'mock' ? (
                  <span className="text-amber-700">mock</span>
                ) : (
                  <span className="text-emerald-700">실제 모델</span>
                )}
              </dd>
            </div>
          </dl>

          {/* 판정 수정 */}
          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              판정 수정
              <span className="ml-2 text-xs text-slate-500 font-normal">
                AI 자동 판정: <strong>{aiVerdict}</strong>
                {verdictChanged && (
                  <span className="ml-1 text-amber-700">→ {verdict} (수정됨)</span>
                )}
              </span>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <VerdictRadio
                value="PASS"
                current={verdict}
                onChange={setVerdict}
                label="합격 (PASS)"
                color="emerald"
              />
              <VerdictRadio
                value="FAIL"
                current={verdict}
                onChange={setVerdict}
                label="불합격 (FAIL)"
                color="red"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              AI 판정이 잘못된 경우 수정해주세요. 원본 AI 판정은 별도로 보존됩니다.
            </p>
          </section>

          {/* 불량 유형 */}
          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              불량 유형
              {verdict === 'PASS' && (
                <span className="ml-2 text-xs text-slate-400 font-normal">
                  (양품 판정 - 참고용)
                </span>
              )}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DEFECT_TYPES.map((d) => (
                <DefectCheckbox
                  key={d}
                  label={d}
                  checked={checkedDefects.has(d)}
                  onToggle={() => toggleDefect(d)}
                />
              ))}
            </div>
            <div className="mt-3">
              <label className="block text-xs text-slate-600 mb-1">
                기타 (쉼표로 여러 개 입력)
              </label>
              <input
                type="text"
                value={etcText}
                onChange={(e) => setEtcText(e.target.value)}
                placeholder="예) 표면 갈변, 모서리 찢어짐"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
              />
            </div>
          </section>

          {/* 메모 */}
          <section>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              메모
              {verdict === 'FAIL' && (
                <span className="ml-2 text-red-600 text-xs font-normal">
                  (불량 원인 기록 권장)
                </span>
              )}
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              placeholder={
                verdict === 'FAIL'
                  ? '예) 우측 상단 미조립 추정 / 라인 3 / 야간 교대조'
                  : '메모를 남길 수 있습니다.'
              }
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm resize-y transition"
            />
          </section>

          {/* 액션 */}
          <div className="flex gap-2">
            <button
              onClick={onSave}
              className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 text-sm font-medium transition"
            >
              {saved ? '✓ 저장됨' : '저장'}
            </button>
            <button
              onClick={onDelete}
              className="ml-auto px-4 py-2 text-red-600 hover:bg-red-50 rounded-md text-sm transition"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function VerdictRadio({
  value,
  current,
  onChange,
  label,
  color,
}: {
  value: Verdict
  current: Verdict
  onChange: (v: Verdict) => void
  label: string
  color: 'emerald' | 'red'
}) {
  const selected = value === current
  const colorCls = selected
    ? color === 'emerald'
      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
      : 'border-red-500 bg-red-50 text-red-700'
    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`px-3 py-2.5 rounded-md border-2 text-sm font-medium transition ${colorCls}`}
    >
      <span className="mr-2">{selected ? '●' : '○'}</span>
      {label}
    </button>
  )
}

function DefectCheckbox({
  label,
  checked,
  onToggle,
}: {
  label: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <label
      className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm cursor-pointer transition ${
        checked
          ? 'bg-red-50 border-red-300 text-red-700'
          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="w-4 h-4 accent-red-600"
      />
      {label}
    </label>
  )
}
