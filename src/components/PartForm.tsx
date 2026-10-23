import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadToStorage } from '@/lib/storage'
import { useAuth } from '@/hooks/useAuth'
import { useCreatePart, useUpdatePart } from '@/hooks/useParts'
import { resolvePhotoUrls, resolveFileUrls, firstUrl } from '@/lib/utils'
import { CachedImg } from './CachedImg'
import { X, Upload, FileText, Camera } from 'lucide-react'

interface PartFormProps {
  workshopId: string
  lineId: string
  onClose: () => void
  initialData?: {
    id: string
    name: string
    description: string | null
    photo_url: string | null
    photo_urls: string[] | null
    file_url: string | null
    file_urls: string[] | null
    link: string | null
    in_stock: boolean
    inventory_number: string | null
    storage_location: string | null
    scheme_name: string | null
  }
}

export function PartForm({ workshopId, lineId, onClose, initialData }: PartFormProps) {
  const { user } = useAuth()
  const [name, setName] = useState(initialData?.name ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [link, setLink] = useState(initialData?.link ?? '')
  const [inStock, setInStock] = useState(initialData?.in_stock ?? true)
  const [inventoryNumber, setInventoryNumber] = useState(initialData?.inventory_number ?? '')
  const [storageLocation, setStorageLocation] = useState(initialData?.storage_location ?? '')
  const [schemeName, setSchemeName] = useState(initialData?.scheme_name ?? '')
  const [photoUrls, setPhotoUrls] = useState<string[]>(resolvePhotoUrls(initialData ?? {}))
  const [fileUrls, setFileUrls] = useState<string[]>(resolveFileUrls(initialData ?? {}))
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const createPart = useCreatePart()
  const updatePart = useUpdatePart()

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    try {
      return await uploadToStorage(file, folder)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
      return null
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const url = await uploadFile(file, 'photos')
      if (url) setPhotoUrls(prev => [...prev, url])
    }
    setUploading(false)
    if (photoRef.current) photoRef.current.value = ''
  }

  const handleCameraUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const url = await uploadFile(file, 'photos')
    if (url) setPhotoUrls(prev => [...prev, url])
    setUploading(false)
    if (cameraRef.current) cameraRef.current.value = ''
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const url = await uploadFile(file, 'files')
      if (url) setFileUrls(prev => [...prev, url])
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const removePhoto = (index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index))
  }

  const removeFile = (index: number) => {
    setFileUrls(prev => prev.filter((_, i) => i !== index))
  }

  const searchSimilarNames = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }
    const { data } = await supabase
      .from('parts')
      .select('name')
      .ilike('name', `%${query}%`)
      .limit(5)
    const names = [...new Set((data ?? []).map(p => p.name))]
    setSuggestions(names)
  }, [])

  useEffect(() => {
    if (!initialData && name.length >= 2) {
      const timer = setTimeout(() => {
        searchSimilarNames(name)
      }, 300)
      return () => clearTimeout(timer)
    }
    setSuggestions([])
  }, [name, initialData, searchSimilarNames])

  const handleNameChange = (value: string) => {
    setName(value)
    setShowSuggestions(true)
  }

  const handleSelectSuggestion = (suggestion: string) => {
    setName(suggestion)
    setShowSuggestions(false)
    setSuggestions([])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const basePayload = {
      name,
      description: description || null,
      photo_url: firstUrl(photoUrls),
      photo_urls: photoUrls.length > 0 ? photoUrls : null,
      file_url: firstUrl(fileUrls),
      file_urls: fileUrls.length > 0 ? fileUrls : null,
      link: link || null,
      in_stock: inStock,
      inventory_number: inStock ? (inventoryNumber || null) : null,
      storage_location: inStock ? (storageLocation || null) : null,
      scheme_name: schemeName || null,
      workshop_id: workshopId,
      line_id: lineId,
    }

    if (initialData) {
      updatePart.mutate(
        { id: initialData.id, ...basePayload, updated_by: user?.id || null },
        {
          onSuccess: () => onClose(),
          onError: (e) => setError(e.message),
        }
      )
    } else {
      createPart.mutate(
        { ...basePayload, created_by: user?.id || null, updated_by: null },
        {
          onSuccess: () => onClose(),
          onError: (e) => setError(e.message),
        }
      )
    }
  }

  const isLoading = createPart.isPending || updatePart.isPending

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-lg p-6 w-full sm:max-w-lg sm:m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {initialData ? 'Редактировать запчасть' : 'Новая запчасть'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              required
              autoFocus
            />
            {showSuggestions && !initialData && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={() => handleSelectSuggestion(suggestion)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700 truncate"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Наименование на схеме</label>
            <input
              type="text"
              value={schemeName}
              onChange={(e) => setSchemeName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ссылка</label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              placeholder="https://..."
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="inStock"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="inStock" className="text-sm font-medium text-gray-700">
              Наличие на складе
            </label>
          </div>
          {inStock && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Учётный номер</label>
                <input
                  type="text"
                  value={inventoryNumber}
                  onChange={(e) => setInventoryNumber(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Место хранения</label>
                <input
                  type="text"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Фото</label>
            <input ref={photoRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="sr-only" />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleCameraUpload} className="sr-only" />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                disabled={uploading}
                className="flex-1 flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 justify-center disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Загрузка...' : 'Галерея'}
              </button>
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                disabled={uploading}
                className="flex-1 flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 justify-center disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                {uploading ? 'Загрузка...' : 'Камера'}
              </button>
            </div>
            {photoUrls.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {photoUrls.map((url, i) => (
                  <div key={i} className="relative group">
                    <CachedImg src={url} alt={`Фото ${i + 1}`} loading="lazy" decoding="async" className="h-20 w-20 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 text-white rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Файлы (PDF и др.)</label>
            <input ref={fileRef} type="file" multiple onChange={handleFileUpload} className="sr-only" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 w-full justify-center disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Загрузка...' : 'Добавить файл'}
            </button>
            {fileUrls.length > 0 && (
              <div className="mt-2 space-y-1">
                {fileUrls.map((url, i) => {
                  const fileName = url.split('/').pop()?.split('_').slice(1).join('_') || url.split('/').pop() || `Файл ${i + 1}`
                  return (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg group">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 truncate flex-1">
                        {fileName}
                      </a>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="p-1 text-red-400 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading || uploading}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
