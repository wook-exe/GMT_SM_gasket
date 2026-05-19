import { useState, type DragEvent, type ChangeEvent } from 'react'

interface Props {
  onFile: (file: File) => void
  disabled?: boolean
}

export default function ImageDropzone({ onFile, disabled }: Props) {
  const [dragging, setDragging] = useState(false)

  const handleFile = (f: File | undefined) => {
    if (!f) return
    if (!f.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }
    onFile(f)
  }

  return (
    <label
      onDragEnter={(e: DragEvent) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragOver={(e: DragEvent) => e.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(e: DragEvent) => {
        e.preventDefault()
        setDragging(false)
        handleFile(e.dataTransfer.files[0])
      }}
      className={`flex flex-col items-center justify-center w-full h-72 border-2 border-dashed rounded-lg cursor-pointer transition ${
        dragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-slate-300 bg-white hover:bg-slate-50'
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <svg
        className="w-14 h-14 mb-3 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
        />
      </svg>
      <p className="text-slate-700 font-medium">클릭 또는 드래그하여 가스켓 이미지 업로드</p>
      <p className="text-slate-500 text-sm mt-1">PNG · JPG · JPEG</p>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => handleFile(e.target.files?.[0])}
        disabled={disabled}
      />
    </label>
  )
}
