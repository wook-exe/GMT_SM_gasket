const KEY = 'gasket-reference'

export function getReference(): string | null {
  return localStorage.getItem(KEY)
}

export function setReference(dataUrl: string) {
  try {
    localStorage.setItem(KEY, dataUrl)
  } catch {
    throw new Error('이미지 용량이 너무 큽니다. 더 작은 파일로 시도하세요.')
  }
}

export function clearReference() {
  localStorage.removeItem(KEY)
}
