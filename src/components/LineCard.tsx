import { useState } from 'react'
import { ImageViewer } from './ImageViewer'
import { CachedImg } from './CachedImg'
import { useBackButtonHandler } from '@/hooks/useBackButton'
import { resolvePhotoUrls, resolveFileUrls, resolvePanelPhotoUrls } from '@/lib/utils'
import { FileText, ChevronDown, ChevronUp } from 'lucide-react'
import type { Line } from '@/types'

interface LineCardProps {
  line: Line
}

export function LineCard({ line }: LineCardProps) {
  const [viewImage, setViewImage] = useState<string | null>(null)
  const [showAllPanelPhotos, setShowAllPanelPhotos] = useState(false)

  useBackButtonHandler(Boolean(viewImage), () => setViewImage(null))

  const photos = resolvePhotoUrls(line)
  const files = resolveFileUrls(line)
  const panelPhotos = resolvePanelPhotoUrls(line)
  const credentials = line.credentials || []
  const visiblePanelPhotos = showAllPanelPhotos ? panelPhotos : panelPhotos.slice(0, 3)

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Инвентарный номер</h3>
            <p className="text-lg font-semibold mb-4">{line.inventory_number || '—'}</p>
            {line.description && (
              <>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Описание</h3>
                <p className="text-gray-700 whitespace-pre-wrap mb-4">{line.description}</p>
              </>
            )}
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photos.map((url, i) => (
                  <CachedImg
                    key={i}
                    src={url}
                    alt={line.name}
                    loading="lazy"
                    decoding="async"
                    className="h-32 object-cover rounded-lg cursor-pointer hover:opacity-80"
                    onClick={() => setViewImage(url)}
                  />
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Шильда производителя</h3>
            <p className="text-gray-700 mb-4 whitespace-pre-wrap">{line.manufacturer_label || '—'}</p>
            {line.manufacturer_photo_url && (
              <CachedImg
                src={line.manufacturer_photo_url}
                alt="Шильда"
                loading="lazy"
                decoding="async"
                className="h-32 object-cover rounded-lg cursor-pointer hover:opacity-80"
                onClick={() => setViewImage(line.manufacturer_photo_url!)}
              />
            )}
          </div>
        </div>

        {files.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Электрическая схема</h3>
            <div className="flex flex-wrap gap-2">
              {files.map((url, i) => {
                const name = url.split('/').pop() || `Файл ${i + 1}`
                return (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100"
                  >
                    <FileText className="w-4 h-4 text-gray-400" />
                    {name}
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* Фото настроек панели — только отображение */}
        {panelPhotos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Фото настроек панели</h3>
            <div className="flex flex-wrap gap-2">
              {visiblePanelPhotos.map((url, i) => (
                <CachedImg
                  key={i}
                  src={url}
                  alt={`Фото панели ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-24 w-24 object-cover rounded-lg cursor-pointer hover:opacity-80"
                  onClick={() => setViewImage(url)}
                />
              ))}
            </div>
            {panelPhotos.length > 3 && (
              <button
                onClick={() => setShowAllPanelPhotos(!showAllPanelPhotos)}
                className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              >
                {showAllPanelPhotos ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Свернуть
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Показать ещё ({panelPhotos.length - 3})
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Учётные данные — только отображение */}
        {line.credentials_enabled && credentials.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Учётные данные</h3>
            <div className="space-y-2">
              {credentials.map((cred, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Имя:</span>{' '}
                      <span className="font-medium">{cred.name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Логин:</span>{' '}
                      <span className="font-medium">{cred.login || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Пароль:</span>{' '}
                      <span className="font-medium">{cred.password || '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {viewImage && (
        <ImageViewer src={viewImage} onClose={() => setViewImage(null)} />
      )}
    </>
  )
}
