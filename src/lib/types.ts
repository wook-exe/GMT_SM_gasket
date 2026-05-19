export type Verdict = 'PASS' | 'FAIL'

export interface InspectionResult {
  id: string
  filename: string
  imageDataUrl: string
  verdict: Verdict
  maskMax: number
  threshold: number
  timestamp: number
  user: string
  memo?: string
  heatmapDataUrl?: string
  source: 'api' | 'mock'
}

export interface User {
  username: string
  loggedInAt: number
}
