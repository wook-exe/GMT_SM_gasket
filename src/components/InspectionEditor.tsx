import { useEffect, useState } from 'react'
import { updateRecord } from '../lib/history'
import { DEFECT_TYPES, type InspectionResult, type Verdict } from '../lib/types'

interface Props {
  record: InspectionResult
  onSaved?: (updated: InspectionResult) => void
  onDelete?: () => void
  /** 헤더 라벨 (단건 검사에서는 "검사 결과 기록" 같은 안내 텍스트) */
  heading?: string
}

export default function InspectionEditor({
  record,
  onSaved,
  onDelete,
  heading,
}: Props) {
  const [verdict, setVerdict] = useState<Verdict>(record.verdict)
  const [checkedDefects, setCheckedDefects] = useState<Set<string>>(new Set())
  const [etcText, setEtcText] = useState('')
  const [memo, setMemo] = useState(record.memo ?? '')
  const [saved, setSaved] = useState(false)

  // record 의 id 가 바뀌면 폼 상태 초기화 (Detail 에서 다른 기록으로 이동, 단건 검사에서 새 검사 시).
  // record.defects/memo 등 내부 필드 변경은 onSaved 콜백에서 발생하므로 무시 — 그렇지 않으면
  // 저장 직후 useEffect 가 폼을 다시 초기화하면서 "✓ 저장됨" 표시가 즉시 사라진다.
  useEffect(() => {
    setVerdict(record.verdict)
    setMemo(record.memo ?? '')
    setSaved(false)

    const known = new Set<string>(DEFECT_TYPES as readonly string[])
    const checked = new Set<string>()
    const extras: string[] = []
    for (const d of record.defects ?? []) {
      if (known.has(d)) checked.add(d)
      else extras.push(d)
    }
    if (record.defectType) {
      if (known.has(record.defectType)) checked.add(record.defectType)
      else if (!extras.includes(record.defectType)) extras.push(record.defectType)
    }
    setCheckedDefects(checked)
    setEtcText(extras.join(', '))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.id])

  const aiVerdict = record.originalVerdict ?? record.verdict
  const verdictChanged = verdict !== aiVerdict

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

    const patch: Partial<InspectionResult> = {
      memo: memo.trim(),
      verdict,
      defects,
      defectType: defects[0],
      originalVerdict: record.originalVerdict ?? record.verdict,
      verdictManual: verdict !== (record.originalVerdict ?? record.verdict),
    }

    updateRecord(record.id, patch)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
    onSaved?.({ ...record, ...patch })
  }

  return (
    <div className="bg-white ring-1 ring-slate-200 border border-slate-200 rounded-lg p-6 space-y-6">
      {heading && (
        <h2 className="text-sm font-semibold text-slate-900">{heading}</h2>
      )}

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
        {onDelete && (
          <button
            onClick={onDelete}
            className="ml-auto px-4 py-2 text-red-600 hover:bg-red-50 rounded-md text-sm transition"
          >
            삭제
          </button>
        )}
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
