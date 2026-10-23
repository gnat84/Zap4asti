import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useDeletePart } from '@/hooks/useParts'
import { useBackButtonHandler } from '@/hooks/useBackButton'
import { resolvePhotoUrls, resolveFileUrls, firstUrl } from '@/lib/utils'
import { PartForm } from './PartForm'
import { ImageViewer } from './ImageViewer'
import { Pencil, Trash2, ExternalLink, FileText, Package } from 'lucide-react'
import type { Part } from '@/types'

interface PartTableProps {
  parts: Part[]
}

export function PartTable({ parts }: PartTableProps) {
  const { isAdmin } = useAuth()
  const [editingPart, setEditingPart] = useState<Part | null>(null)
  const [viewImage, setViewImage] = useState<string | null>(null)
  const deletePart = useDeletePart()

  useBackButtonHandler(Boolean(viewImage), () => setViewImage(null))
  useBackButtonHandler(Boolean(editingPart), () => setEditingPart(null))

  const handleDelete = (part: Part) => {
    if (!confirm('Удалить запчасть?')) return
    deletePart.mutate({ id: part.id, lineId: part.line_id })
  }

  if (parts.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Нет запчастей</p>
      </div>
    )
  }

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Название</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Описание</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Фото</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Наличие</th>
              {isAdmin && <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Учётный номер</th>}
              {isAdmin && <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Место хранения</th>}
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Файл</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Ссылка</th>
              {isAdmin && <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Создатель</th>}
              {isAdmin && <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Редактор</th>}
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Действия</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part) => {
              const firstPhoto = firstUrl(resolvePhotoUrls(part))
              return (
                <tr
                  key={part.id}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => window.location.hash = `#/part/${part.id}`}
                >
                  <td className="py-3 px-4 font-medium">
                    <Link to={`/part/${part.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                      {part.name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">{part.description}</td>
                  <td className="py-3 px-4">
                    {firstPhoto && (
                      <img
                        src={firstPhoto}
                        alt={part.name}
                        className="h-10 w-10 object-cover rounded cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setViewImage(firstPhoto) }}
                      />
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      part.in_stock
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {part.in_stock ? 'В наличии' : 'Нет'}
                    </span>
                  </td>
                  {isAdmin && <td className="py-3 px-4 text-sm">{part.inventory_number}</td>}
                  {isAdmin && <td className="py-3 px-4 text-sm">{part.storage_location}</td>}
                  <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                    {firstUrl(resolveFileUrls(part)) && (
                      <a href={firstUrl(resolveFileUrls(part))!} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                        <FileText className="w-4 h-4" />
                        {resolveFileUrls(part).length > 1 && <span className="text-xs ml-0.5">({resolveFileUrls(part).length})</span>}
                      </a>
                    )}
                  </td>
                  <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                    {part.link && (
                      <a href={part.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </td>
                  {isAdmin && <td className="py-3 px-4 text-sm text-gray-500">{part.created_by}</td>}
                  {isAdmin && <td className="py-3 px-4 text-sm text-gray-500">{part.updated_by}</td>}
                  <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingPart(part)} className="text-gray-500 hover:text-gray-700">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(part)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {parts.map((part) => {
          const firstPhoto = firstUrl(resolvePhotoUrls(part))
          return (
            <div
              key={part.id}
              className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer"
              onClick={() => window.location.hash = `#/part/${part.id}`}
            >
              <div className="flex items-start gap-3">
                {firstPhoto ? (
                  <img
                    src={firstPhoto}
                    alt={part.name}
                    className="w-14 h-14 object-cover rounded-lg shrink-0 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); setViewImage(firstPhoto) }}
                  />
                ) : (
                  <div className="w-14 h-14 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/part/${part.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-blue-600 hover:text-blue-800 truncate">
                      {part.name}
                    </Link>
                    <span className={`shrink-0 px-2 py-0.5 text-xs rounded-full ${
                      part.in_stock
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {part.in_stock ? 'В наличии' : 'Нет'}
                    </span>
                  </div>
                  {part.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{part.description}</p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
                    {isAdmin && part.inventory_number && (
                      <span>Учётный № {part.inventory_number}</span>
                    )}
                    {isAdmin && part.storage_location && (
                      <span>Место: {part.storage_location}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    {firstUrl(resolveFileUrls(part)) && (
                      <a
                        href={firstUrl(resolveFileUrls(part))!}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Файл{resolveFileUrls(part).length > 1 ? ` (${resolveFileUrls(part).length})` : ''}
                      </a>
                    )}
                    {part.link && (
                      <a
                        href={part.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ссылка
                      </a>
                    )}
                    <div className="flex-1" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingPart(part) }}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(part) }}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {editingPart && (
        <PartForm
          workshopId={editingPart.workshop_id}
          lineId={editingPart.line_id}
          initialData={editingPart}
          onClose={() => setEditingPart(null)}
        />
      )}
      {viewImage && (
        <ImageViewer src={viewImage} onClose={() => setViewImage(null)} />
      )}
    </>
  )
}
