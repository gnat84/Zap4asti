import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePart, useUpdatePart } from '@/hooks/useParts'
import { useLine } from '@/hooks/useLines'
import { useWorkshop } from '@/hooks/useWorkshops'
import { resolvePhotoUrls, resolveFileUrls, firstUrl } from '@/lib/utils'
import { Breadcrumb } from '@/components/Breadcrumb'
import { ImageViewer } from '@/components/ImageViewer'
import { CachedImg } from '@/components/CachedImg'
import { PartForm } from '@/components/PartForm'
import { AuditBlock } from '@/components/AuditBlock'
import { FileText, ExternalLink, Package, Pencil, Trash2, X } from 'lucide-react'
import { useBackButtonHandler } from '@/hooks/useBackButton'

export function PartDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [viewImage, setViewImage] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  useBackButtonHandler(Boolean(viewImage), () => setViewImage(null))
  useBackButtonHandler(editing, () => setEditing(false))

  const { data: part, isLoading } = usePart(id)
  const { data: line } = useLine(part?.line_id)
  const { data: workshop } = useWorkshop(line?.workshop_id)
  const updatePart = useUpdatePart()

  const handleDeletePhoto = (url: string) => {
    if (!part) return
    const urls = resolvePhotoUrls(part).filter(u => u !== url)
    updatePart.mutate({
      id: part.id,
      photo_url: firstUrl(urls),
      photo_urls: urls.length > 0 ? urls : null,
    })
  }

  const handleDeleteFile = (url: string) => {
    if (!part) return
    const urls = resolveFileUrls(part).filter(u => u !== url)
    updatePart.mutate({
      id: part.id,
      file_url: firstUrl(urls),
      file_urls: urls.length > 0 ? urls : null,
    })
  }

  if (isLoading) return <p className="text-gray-500 py-8 text-center">Загрузка...</p>
  if (!part) return <p className="text-gray-500 py-8 text-center">Запчасть не найдена</p>

  const photos = resolvePhotoUrls(part)
  const files = resolveFileUrls(part)

  return (
    <div>
      <Breadcrumb
        items={[
          { label: workshop?.name || '...', path: `/workshop/${workshop?.id}` },
          { label: line?.name || '...', path: `/line/${line?.id}` },
          { label: part.name, path: `/part/${part.id}` },
        ]}
      />
      <div className="max-w-2xl">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h2 className="text-xl md:text-2xl font-bold truncate">{part.name}</h2>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm shrink-0"
          >
            <Pencil className="w-4 h-4" />
            <span className="hidden sm:inline">Редактировать</span>
          </button>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 space-y-4">
          {photos.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Фото</h3>
              <div className="flex flex-wrap gap-2">
                {photos.map((url, i) => (
                  <div key={i} className="relative group">
                    <CachedImg
                      src={url}
                      alt={`Фото ${i + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="h-24 w-24 object-cover rounded-lg cursor-pointer hover:opacity-80"
                      onClick={() => setViewImage(url)}
                    />
                    <button
                      onClick={() => handleDeletePhoto(url)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full h-32 bg-gray-50 rounded-lg flex items-center justify-center">
              <Package className="w-12 h-12 text-gray-300" />
            </div>
          )}

          {part.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Описание</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{part.description}</p>
            </div>
          )}

          {part.scheme_name && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Наименование на схеме</h3>
              <p className="text-gray-700">{part.scheme_name}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Наличие</h3>
            <span className={`inline-block px-2.5 py-1 text-xs rounded-full ${
              part.in_stock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {part.in_stock ? 'В наличии' : 'Нет на складе'}
            </span>
          </div>

          {part.in_stock && (
            <>
              {part.inventory_number && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Учётный номер</h3>
                  <p className="text-gray-700">{part.inventory_number}</p>
                </div>
              )}
              {part.storage_location && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Место хранения</h3>
                  <p className="text-gray-700">{part.storage_location}</p>
                </div>
              )}
            </>
          )}

          {part.link && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Ссылка</h3>
              <a
                href={part.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="w-4 h-4" />
                Открыть ссылку
              </a>
            </div>
          )}

          {files.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Файлы</h3>
              <div className="space-y-1">
                {files.map((url, i) => {
                  const fileName = url.split('/').pop()?.split('_').slice(1).join('_') || url.split('/').pop() || `Файл ${i + 1}`
                  return (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg group">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 truncate flex-1">
                        {fileName}
                      </a>
                      <button
                        onClick={() => handleDeleteFile(url)}
                        className="p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <AuditBlock
            createdBy={part.created_by}
            createdAt={part.created_at}
            createdByUser={part.created_by_user}
            updatedBy={part.updated_by}
            updatedAt={part.updated_at}
            updatedByUser={part.updated_by_user}
          />
        </div>
      </div>

      {viewImage && (
        <ImageViewer src={viewImage} onClose={() => setViewImage(null)} />
      )}

      {editing && line && (
        <PartForm
          workshopId={line.workshop_id}
          lineId={line.id}
          initialData={part}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
