import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLine, useDeleteLine } from '@/hooks/useLines'
import { useWorkshop } from '@/hooks/useWorkshops'
import { useParts } from '@/hooks/useParts'
import { Breadcrumb } from '@/components/Breadcrumb'
import { LineCard } from '@/components/LineCard'
import { LineForm } from '@/components/LineForm'
import { PartTable } from '@/components/PartTable'
import { PartForm } from '@/components/PartForm'
import { FaultForm } from '@/components/FaultForm'
import { FaultList } from '@/components/FaultList'
import { Pencil, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { useBackButtonHandler } from '@/hooks/useBackButton'

export function LinePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showLineForm, setShowLineForm] = useState(false)
  const [showPartForm, setShowPartForm] = useState(false)
  const [showFaultForm, setShowFaultForm] = useState(false)
  const { isAdmin } = useAuth()

  useBackButtonHandler(showLineForm, () => setShowLineForm(false))
  useBackButtonHandler(showPartForm, () => setShowPartForm(false))
  useBackButtonHandler(showFaultForm, () => setShowFaultForm(false))

  const { data: line } = useLine(id)
  const { data: workshop } = useWorkshop(line?.workshop_id)
  const { data: parts = [] } = useParts(id)
  const deleteLine = useDeleteLine()

  const handleDelete = () => {
    if (!line) return
    if (parts.length > 0) {
      alert('Сначала удалите все запчасти из этой линии')
      return
    }
    if (!confirm(`Удалить линию «${line.name}»? Все запчасти будут удалены.`)) return
    deleteLine.mutate({ id: line.id, workshopId: line.workshop_id }, {
      onSuccess: () => navigate(`/workshop/${line.workshop_id}`),
    })
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { label: workshop?.name || '...', path: `/workshop/${line?.workshop_id}` },
          { label: line?.name || '...', path: `/line/${id}` },
        ]}
      />
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-xl md:text-2xl font-bold truncate">{line?.name}</h2>
        <div className="flex gap-2 shrink-0">
          {line && (
            <>
              <button
                onClick={() => setShowLineForm(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">Редактировать</span>
              </button>
              {isAdmin && (
                <button
                  onClick={handleDelete}
                  className={`flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm ${parts.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Удалить</span>
                </button>
              )}
            </>
          )}
          <button
            onClick={() => setShowPartForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Запчасть
          </button>
          <button
            onClick={() => setShowFaultForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium"
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Неисправность</span>
          </button>
        </div>
      </div>
      {line && <LineCard line={line} />}
      <PartTable parts={parts} />
      {line && <FaultList line={line} />}
      {showLineForm && line && (
        <LineForm
          workshopId={line.workshop_id}
          initialData={line}
          onClose={() => setShowLineForm(false)}
        />
      )}
      {showPartForm && line && (
        <PartForm
          workshopId={line.workshop_id}
          lineId={line.id}
          onClose={() => setShowPartForm(false)}
        />
      )}
      {showFaultForm && line && (
        <FaultForm
          lineId={line.id}
          workshopId={line.workshop_id}
          onClose={() => setShowFaultForm(false)}
        />
      )}
    </div>
  )
}
