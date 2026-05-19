import type { Verdict } from './types'

export const THRESHOLD = 46.45

export interface InferResponse {
  verdict: Verdict
  maskMax: number
  threshold: number
  heatmapDataUrl?: string
  source: 'api' | 'mock'
}

const API_URL = import.meta.env.VITE_API_URL as string | undefined

export async function inferGasket(file: File): Promise<InferResponse> {
  if (API_URL && API_URL.length > 0) {
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch(`${API_URL.replace(/\/$/, '')}/infer`, {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const j = (await res.json()) as {
        verdict: string
        mask_max: number
        threshold?: number
        heatmap_base64?: string
      }
      return {
        verdict: j.verdict === 'FAIL' ? 'FAIL' : 'PASS',
        maskMax: j.mask_max,
        threshold: j.threshold ?? THRESHOLD,
        heatmapDataUrl: j.heatmap_base64
          ? `data:image/png;base64,${j.heatmap_base64}`
          : undefined,
        source: 'api',
      }
    } catch (e) {
      console.warn('[inference] API 호출 실패, mock으로 fallback:', e)
    }
  }
  return mockInfer(file)
}

async function mockInfer(file: File): Promise<InferResponse> {
  const buf = await file.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buf)
  const view = new DataView(hash)
  // 파일 해시 기반 결정론적 점수 (0~100). 같은 파일은 항상 같은 결과.
  const score = (view.getUint32(0) % 10000) / 100

  await new Promise((r) => setTimeout(r, 350))

  return {
    verdict: score >= THRESHOLD ? 'FAIL' : 'PASS',
    maskMax: score,
    threshold: THRESHOLD,
    source: 'mock',
  }
}

export async function fileToThumbnail(file: File, maxSize = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('이미지 디코드 실패'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('canvas 컨텍스트 생성 실패'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.78))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
