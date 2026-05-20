export type Verdict = 'PASS' | 'FAIL'

/** 가스켓 불량 유형 (PatchCore는 점수만 산출하므로 데모/수동 분류용) */
export const DEFECT_TYPES = ['미조립', '녹', '오일', '휨'] as const
export type DefectType = (typeof DEFECT_TYPES)[number]

/** 제품 목록 */
export const PRODUCTS = [
  '냉장고 도어 가스켓 RT-A24',
  '냉장고 도어 가스켓 RT-B30',
  '냉장고 도어 가스켓 RS-C18',
  '김치냉장고 가스켓 KZ-D12',
] as const

export interface InspectionResult {
  id: string
  productName: string
  filename: string
  imageDataUrl?: string
  verdict: Verdict
  maskMax: number
  threshold: number
  timestamp: number
  user: string
  memo?: string
  defectType?: string
  heatmapDataUrl?: string
  source: 'api' | 'mock'
  /** 시연용 자동 생성 데이터 여부 */
  demo?: boolean
}

export interface Session {
  /** 표시 이름 (예: 관리자) */
  username: string
  /** 로그인 ID (예: admin) */
  loginId: string
  token: string
  issuedAt: number
}
