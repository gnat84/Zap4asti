import { useState } from 'react'
import { useFaults, useDeleteFault } from '@/hooks/useFaults'
import { useAuth } from '@/hooks/useAuth'
import { useBackButtonHandler } from '@/hooks/useBackButton'
import { CachedImg } from './CachedImg'
import { ImageViewer } from './ImageViewer'
import { FaultForm } from './FaultForm'
import { Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { resolvePhotoUrls, formatDate } from '@/lib/utils'
import type { Line } from '@/types'

interface FaultListProps {
  line: Line
}

export function FaultList({ line }: FaultListProps) {
  const { isAdmin } = useAuth()
  const { data: faults = [] } = useFaults(line.id)
  const deleteFault = useDeleteFault()
  const [viewImage, setViewImage] = useState<string | null>(null)
  const [editingFault, setEditingFault] = useState<typeof faults[0] | null>(null)

  useBackButtonHandler(Boolean(viewImage), () => setViewImage(null))
  useBackButtonHandler(Boolean(editingFault), () => setEditingFault(null))

  const handleDelete = (id: string) => {
    if (!confirm('Удалить неисправность?')) return
    deleteFault.mutate({ id, lineId: line.id })
  }

  if (faults.length === 0) return null

  return (
    <>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Основные неисправности
        </h3>
        <div className="space-y-3">
          {faults.map((fault) => {
            const photos = resolvePhotoUrls(fault)
            return (
              <div key={fault.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {fault.fault_date && (
                      <p className="text-xs text-gray-400 mb-1">
                        {formatDate(fault.fault_date)}
                      </p>
                    )}
                    <p className="text-sm font-medium text-gray-900 whitespace-pre-wrap mb-2">{fault.symptoms}</p>
                    {fault.resolution && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-500 mb-1">Методы устранения:</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{fault.resolution}</p>
                      </div>
                    )}
                    {photos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {photos.map((url, i) => (
                          <CachedImg
                            key={i}
                            src={url}
                            alt={`Фото неисправности ${i + 1}`}
                            loading="lazy"
                            decoding="async"
                            className="h-20 w-20 object-cover rounded-lg cursor-pointer hover:opacity-80"
                            onClick={() => setViewImage(url)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setEditingFault(fault)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(fault.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {viewImage && (
        <ImageViewer src={viewImage} onClose={() => setViewImage(null)} />
      )}

      {editingFault && (
        <FaultForm
          lineId={line.id}
          workshopId={line.workshop_id}
          initialData={editingFault}
          onClose={() => setEditingFault(null)}
        />
      )}
    </>
  )
}
