import { useRef } from 'react'
import { uploadToStorage } from '@/lib/storage'
import { CachedImg } from './CachedImg'
import { X, Upload, Camera, FileText } from 'lucide-react'

interface FileUploadZoneProps {
  label: string
  urls: string[]
  onUrlsChange: (urls: string[]) => void
  type?: 'image' | 'file'
  accept?: string
  multiple?: boolean
  disabled?: boolean
  onUploadStart?: () => void
  onUploadEnd?: () => void
  onError?: (message: string) => void
  folder?: string
  showFileName?: boolean
}

export function FileUploadZone({
  label,
  urls,
  onUrlsChange,
  type = 'image',
  accept = type === 'image' ? 'image/*' : undefined,
  multiple = type === 'image',
  disabled,
  onUploadStart,
  onUploadEnd,
  onError,
  folder = 'photos',
  showFileName,
}: FileUploadZoneProps) {
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    onUploadStart?.()
    try {
      for (const file of Array.from(files)) {
        const url = await uploadToStorage(file, folder)
        if (url) onUrlsChange([...urls, url])
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      onUploadEnd?.()
      if (e.target) e.target.value = ''
    }
  }

  const remove = (index: number) => {
    onUrlsChange(urls.filter((_, i) => i !== index))
  }

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input
        ref={galleryRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleUpload}
        className="sr-only"
      />
      {type === 'image' && (
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleUpload}
          className="sr-only"
        />
      )}
      {type === 'image' ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={disabled}
            className="flex-1 flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 justify-center disabled:opacity-50"
          >
            <Upload className="w-4 h-4" /> Галерея
          </button>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={disabled}
            className="flex-1 flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 justify-center disabled:opacity-50"
          >
            <Camera className="w-4 h-4" /> Камера
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 w-full justify-center disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          Добавить файл
        </button>
      )}

      {urls.length > 0 && (
        <div className={type === 'image' ? 'mt-2 flex flex-wrap gap-2' : 'mt-2 space-y-1'}>
          {urls.map((url, i) => (
            type === 'image' ? (
              <div key={i} className="relative group">
                <CachedImg
                  src={url}
                  alt={`Фото ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-20 w-20 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 text-white rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg group">
                <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 truncate flex-1"
                >
                  {showFileName
                    ? url.split('/').pop()?.split('_').slice(1).join('_') || url.split('/').pop() || `Файл ${i + 1}`
                    : url.split('/').pop() || `Файл ${i + 1}`}
                </a>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="p-1 text-red-400 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}
