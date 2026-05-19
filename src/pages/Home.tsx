import { Link } from 'react-router-dom'
import { getCurrentUser } from '../lib/auth'

export default function Home() {
  const user = getCurrentUser()
  return (
    <div className="space-y-16">
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
          냉장고 가스켓 불량 검사 시스템
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
          PatchCore 기반 AI가 미조립·녹·오일·휨 4종 불량을 자동 판정합니다.
          이미지를 업로드하면 즉시 PASS / FAIL 결과를 받을 수 있습니다.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            to={user ? '/inspect' : '/login'}
            className="px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition"
          >
            {user ? '검사 시작 →' : '로그인 후 시작 →'}
          </Link>
          {user && (
            <Link
              to="/history"
              className="px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
            >
              이력 보기
            </Link>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: 'F1 = 0.822',
            body: '링 마스크(outer=20, inner=40) + mask_max ≥ 46.45 임계값으로 안정적 분류',
          },
          {
            title: '비지도 학습',
            body: 'PatchCore 이상치 탐지로 학습 데이터 4,656장(정상만) · 불량 라벨링 불필요',
          },
          {
            title: 'Edge 추론',
            body: 'OpenVINO IR 변환 후 Intel CPU에서 실시간 추론 (산업용 PC 대응)',
          },
        ].map((c) => (
          <div
            key={c.title}
            className="p-6 bg-white rounded-lg border border-slate-200"
          >
            <div className="text-xl font-semibold mb-2 text-slate-900">{c.title}</div>
            <p className="text-sm text-slate-600 leading-relaxed">{c.body}</p>
          </div>
        ))}
      </section>

      <section className="bg-white rounded-lg border border-slate-200 p-8">
        <h2 className="text-xl font-semibold mb-4">사용 방법</h2>
        <ol className="space-y-3 text-slate-700 list-decimal list-inside">
          <li>상단 메뉴 <b>로그인</b> → 사용자명 입력 (서버 없는 간이 로그인)</li>
          <li><b>검사</b> 메뉴에서 가스켓 이미지를 업로드</li>
          <li>판정 결과(PASS/FAIL) 및 mask_max 점수 확인</li>
          <li>FAIL 시 <b>메모 작성</b>으로 불량 원인·라인·교대조 기록</li>
          <li><b>이력</b>에서 전체 검사 기록 조회 · <b>마이</b>에서 통계 확인</li>
        </ol>
      </section>
    </div>
  )
}
