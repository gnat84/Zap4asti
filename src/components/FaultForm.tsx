import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCreateFault, useUpdateFault } from '@/hooks/useFaults'
import { resolvePhotoUrls, firstUrl } from '@/lib/utils'
import { FileUploadZone } from './FileUploadZone'
import { X } from 'lucide-react'
import type { Fault } from '@/types'

interface FaultFormProps {
  lineId: string
  workshopId: string
  onClose: () => void
  initialData?: Fault
}

export function FaultForm({ lineId, workshopId, onClose, initialData }: FaultFormProps) {
  const { user } = useAuth()
  const [symptoms, setSymptoms] = useState(initialData?.symptoms ?? '')
  const [resolution, setResolution] = useState(initialData?.resolution ?? '')
  const [faultDate, setFaultDate] = useState(initialData?.fault_date ?? '')
  const [photoUrls, setPhotoUrls] = useState<string[]>(resolvePhotoUrls(initialData ?? {}))
  const [error, setError] = useState('')
  const [uploadCount, setUploadCount] = useState(0)
  const uploading = uploadCount > 0

  const createFault = useCreateFault()
  const updateFault = useUpdateFault()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const payload = {
      symptoms,
      resolution: resolution || null,
      fault_date: faultDate || null,
      photo_url: firstUrl(photoUrls),
      photo_urls: photoUrls.length > 0 ? photoUrls : null,
      line_id: lineId,
      workshop_id: workshopId,
      updated_at: new Date().toISOString(),
      created_by: user?.email || null,
      updated_by: user?.email || null,
    }

    if (initialData) {
      updateFault.mutate(
        { id: initialData.id, ...payload },
        {
          onSuccess: () => onClose(),
          onError: (e) => setError(e.message),
        }
      )
    } else {
      createFault.mutate(payload, {
        onSuccess: () => onClose(),
        onError: (e) => setError(e.message),
      })
    }
  }

  const isLoading = createFault.isPending || updateFault.isPending

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-lg p-6 w-full sm:max-w-lg sm:m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {initialData ? 'Редактировать неисправность' : 'Новая неисправность'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Симптомы неисправности</label>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              rows={3}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Методы устранения</label>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата неисправности</label>
            <input
              type="date"
              value={faultDate}
              onChange={(e) => setFaultDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            />
          </div>

          <FileUploadZone
            label="Фото неисправности"
            urls={photoUrls}
            onUrlsChange={setPhotoUrls}
            type="image"
            multiple
            disabled={uploading}
            onUploadStart={() => setUploadCount(prev => prev + 1)}
            onUploadEnd={() => setUploadCount(prev => prev - 1)}
            onError={setError}
            folder="faults"
          />

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Отмена</button>
            <button type="submit" disabled={isLoading || uploading} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
