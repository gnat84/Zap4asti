import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { X, Upload, Package } from 'lucide-react'

interface VersionUploadModalProps {
  onClose: () => void
  onSaved?: () => void
}

export function VersionUploadModal({ onClose, onSaved }: VersionUploadModalProps) {
  const { user } = useAuth()
  const [version, setVersion] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    if (!version.trim()) {
      setError('Введите номер версии')
      return
    }
    if (!file) {
      setError('Выберите APK файл')
      return
    }

    setLoading(true)
    setError('')
    setUploading(true)
    setProgress(0)

    // Удалить предыдущую версию
    try {
      const { data: currentVersion } = await supabase
        .from('app_versions')
        .select('id, file_url')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (currentVersion?.file_url) {
        const oldPath = currentVersion.file_url.split('/app-uploads/')[1]
        if (oldPath) {
          await supabase.storage.from('app-uploads').remove([oldPath])
        }
        await supabase.from('app_versions').delete().eq('id', currentVersion.id)
      }
    } catch {
      // Игнорируем ошибки удаления старой версии
    }

    const ext = file.name.split('.').pop()
    const path = `versions/${version.trim()}_${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('app-uploads')
      .upload(path, file, {
        upsert: false,
      })

    if (uploadError) {
      setError(`Ошибка загрузки: ${uploadError.message}`)
      setLoading(false)
      setUploading(false)
      return
    }

    setProgress(100)
    const { data: urlData } = supabase.storage.from('app-uploads').getPublicUrl(path)
    const fileUrl = urlData.publicUrl

    const { error: dbError } = await supabase.from('app_versions').insert({
      version: version.trim(),
      file_url: fileUrl,
      created_by: user?.email || null,
    })

    setLoading(false)
    setUploading(false)

    if (dbError) {
      setError(`Ошибка сохранения: ${dbError.message}`)
      return
    }

    onSaved?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-lg p-6 w-full sm:max-w-md sm:m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Обновление приложения</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Номер версии</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="напр. 1.0.2"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">APK файл</label>
            <input
              ref={fileRef}
              type="file"
              accept=".apk"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) {
                  setFile(f)
                  setError('')
                }
              }}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="w-full flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 justify-center disabled:opacity-50"
            >
              {file ? (
                <>
                  <Package className="w-4 h-4 text-green-600" />
                  <span className="text-sm truncate">{file.name}</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Выбрать APK</span>
                </>
              )}
            </button>
          </div>

          {uploading && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={loading || !version.trim() || !file}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Загрузка...' : 'Опубликовать'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
