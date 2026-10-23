import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCreateLine, useUpdateLine } from '@/hooks/useLines'
import { uploadToStorage } from '@/lib/storage'
import { resolveFileUrls, resolvePanelPhotoUrls, firstUrl } from '@/lib/utils'
import { FileUploadZone } from './FileUploadZone'
import { CredentialsEditor, type Credential } from './CredentialsEditor'
import { X, Upload, Camera } from 'lucide-react'
import type { Line } from '@/types'

interface LineFormProps {
  workshopId: string
  onClose: () => void
  initialData?: Partial<Line> & { id: string; name: string }
}

export function LineForm({ workshopId, onClose, initialData }: LineFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [inventoryNumber, setInventoryNumber] = useState(initialData?.inventory_number ?? '')
  const [manufacturerLabel, setManufacturerLabel] = useState(initialData?.manufacturer_label ?? '')
  const [photoUrl, setPhotoUrl] = useState(initialData?.photo_url ?? '')
  const [manufacturerPhotoUrl, setManufacturerPhotoUrl] = useState(initialData?.manufacturer_photo_url ?? '')
  const [error, setError] = useState('')
  const [fileUrls, setFileUrls] = useState<string[]>(resolveFileUrls(initialData ?? {}))
  const [showPanelUpload, setShowPanelUpload] = useState(resolvePanelPhotoUrls(initialData ?? {}).length > 0)
  const [panelPhotoUrls, setPanelPhotoUrls] = useState<string[]>(resolvePanelPhotoUrls(initialData ?? {}))
  const [credentialsEnabled, setCredentialsEnabled] = useState(initialData?.credentials_enabled ?? false)
  const [credentials, setCredentials] = useState<Credential[]>(initialData?.credentials ?? [])
  const [uploadCount, setUploadCount] = useState(0)
  const uploading = uploadCount > 0

  const createLine = useCreateLine()
  const updateLine = useUpdateLine()

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadCount(prev => prev + 1)
    try {
      const url = await uploadToStorage(file, 'lines')
      if (url) setPhotoUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setUploadCount(prev => prev - 1)
    }
  }

  const handleMfgPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadCount(prev => prev + 1)
    try {
      const url = await uploadToStorage(file, 'lines')
      if (url) setManufacturerPhotoUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setUploadCount(prev => prev - 1)
    }
  }

  const { user } = useAuth()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const payload = {
      name,
      description: description || null,
      workshop_id: workshopId,
      inventory_number: inventoryNumber || null,
      photo_url: photoUrl || null,
      photo_urls: null as string[] | null,
      file_url: firstUrl(fileUrls),
      file_urls: fileUrls.length > 0 ? fileUrls : null,
      manufacturer_label: manufacturerLabel || null,
      manufacturer_photo_url: manufacturerPhotoUrl || null,
      panel_photo_url: firstUrl(panelPhotoUrls),
      panel_photo_urls: panelPhotoUrls.length > 0 ? panelPhotoUrls : null,
      credentials_enabled: credentialsEnabled,
      credentials: credentials.length > 0 ? credentials : null,
    }

    if (initialData) {
      updateLine.mutate(
        { id: initialData.id, ...payload, updated_by: user?.id || null },
        { onSuccess: () => onClose(), onError: (e) => setError(e.message) }
      )
    } else {
      createLine.mutate(
        { ...payload, created_by: user?.id || null, updated_by: null },
        { onSuccess: () => onClose(), onError: (e) => setError(e.message) }
      )
    }
  }

  const isLoading = createLine.isPending || updateLine.isPending

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-lg p-6 w-full sm:max-w-lg sm:m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {initialData ? 'Редактировать линию' : 'Новая линия'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{error}</div>
          )}

          {/* Основные поля */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Инвентарный номер</label>
            <input
              type="text"
              value={inventoryNumber}
              onChange={(e) => setInventoryNumber(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            />
          </div>

          {/* Фото линии (single upload) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Фото линии</label>
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="sr-only" id="line-photo" />
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="sr-only" id="line-camera" />
            <div className="flex gap-2">
              <button type="button" onClick={() => document.getElementById('line-photo')?.click()} className="flex-1 flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 justify-center">
                <Upload className="w-4 h-4" /> Галерея
              </button>
              <button type="button" onClick={() => document.getElementById('line-camera')?.click()} className="flex-1 flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 justify-center">
                <Camera className="w-4 h-4" /> Камера
              </button>
            </div>
            {photoUrl && (
              <img src={photoUrl} alt="Фото линии" loading="lazy" className="mt-2 h-20 rounded" />
            )}
          </div>

          {/* Шильда производителя */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Шильда производителя (текст)</label>
            <textarea
              value={manufacturerLabel}
              onChange={(e) => setManufacturerLabel(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Фото шильды</label>
            <input type="file" accept="image/*" onChange={handleMfgPhotoUpload} className="sr-only" id="mfg-photo" />
            <input type="file" accept="image/*" capture="environment" onChange={handleMfgPhotoUpload} className="sr-only" id="mfg-camera" />
            <div className="flex gap-2">
              <button type="button" onClick={() => document.getElementById('mfg-photo')?.click()} className="flex-1 flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 justify-center">
                <Upload className="w-4 h-4" /> Галерея
              </button>
              <button type="button" onClick={() => document.getElementById('mfg-camera')?.click()} className="flex-1 flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 justify-center">
                <Camera className="w-4 h-4" /> Камера
              </button>
            </div>
            {manufacturerPhotoUrl && (
              <img src={manufacturerPhotoUrl} alt="Шильда" loading="lazy" className="mt-2 h-20 rounded" />
            )}
          </div>

          {/* Файлы (схемы) */}
          <FileUploadZone
            label="Электрическая схема"
            urls={fileUrls}
            onUrlsChange={setFileUrls}
            type="file"
            multiple
            disabled={uploading}
            onUploadStart={() => setUploadCount(prev => prev + 1)}
            onUploadEnd={() => setUploadCount(prev => prev - 1)}
            onError={setError}
            folder="lines"
          />

          {/* Фото панели */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPanelUpload}
                disabled={showPanelUpload && panelPhotoUrls.length > 0}
                onChange={(e) => {
                  setShowPanelUpload(e.target.checked)
                  if (!e.target.checked) setPanelPhotoUrls([])
                }}
                className="w-4 h-4 text-blue-600 rounded disabled:opacity-50"
              />
              <span className={`text-sm font-medium ${showPanelUpload && panelPhotoUrls.length > 0 ? 'text-gray-400' : 'text-gray-700'}`}>
                Добавить фото настроек панели
                {showPanelUpload && panelPhotoUrls.length > 0 && ' (удалите фото для отмены)'}
              </span>
            </label>
            {showPanelUpload && (
              <FileUploadZone
                label=""
                urls={panelPhotoUrls}
                onUrlsChange={setPanelPhotoUrls}
                type="image"
                multiple
                disabled={uploading}
                onUploadStart={() => setUploadCount(prev => prev + 1)}
                onUploadEnd={() => setUploadCount(prev => prev - 1)}
                onError={setError}
                folder="lines"
              />
            )}
          </div>

          {/* Учётные данные */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={credentialsEnabled}
                disabled={credentialsEnabled && credentials.length > 0}
                onChange={(e) => {
                  setCredentialsEnabled(e.target.checked)
                  if (!e.target.checked) setCredentials([])
                }}
                className="w-4 h-4 text-blue-600 rounded disabled:opacity-50"
              />
              <span className={`text-sm font-medium ${credentialsEnabled && credentials.length > 0 ? 'text-gray-400' : 'text-gray-700'}`}>
                Добавить Логин и Пароль
                {credentialsEnabled && credentials.length > 0 && ' (удалите записи для отмены)'}
              </span>
            </label>
            {credentialsEnabled && (
              <div className="mt-2">
                <CredentialsEditor credentials={credentials} onChange={setCredentials} />
              </div>
            )}
          </div>

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
