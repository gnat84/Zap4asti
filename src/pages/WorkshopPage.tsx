import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useWorkshop, useDeleteWorkshop } from '@/hooks/useWorkshops'
import { useLines, useDeleteLine } from '@/hooks/useLines'
import { supabase } from '@/lib/supabase'
import { Breadcrumb } from '@/components/Breadcrumb'
import { LineForm } from '@/components/LineForm'
import { WorkshopForm } from '@/components/WorkshopForm'
import { Plus, ArrowRight, Inbox, Trash2, Pencil } from 'lucide-react'
import { useBackButtonHandler } from '@/hooks/useBackButton'

export function WorkshopPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showLineForm, setShowLineForm] = useState(false)
  const [editingWorkshop, setEditingWorkshop] = useState(false)
  const [partsCount, setPartsCount] = useState<Record<string, number>>({})
  const { isAdmin } = useAuth()

  useBackButtonHandler(showLineForm, () => setShowLineForm(false))
  useBackButtonHandler(editingWorkshop, () => setEditingWorkshop(false))

  const { data: workshop } = useWorkshop(id)
  const { data: lines = [] } = useLines(id)
  const deleteWorkshop = useDeleteWorkshop()
  const deleteLine = useDeleteLine()

  useEffect(() => {
    const fetchPartsCount = async () => {
      const { data } = await supabase
        .from('parts')
        .select('line_id')
      if (data) {
        const counts: Record<string, number> = {}
        data.forEach((part) => {
          counts[part.line_id] = (counts[part.line_id] || 0) + 1
        })
        setPartsCount(counts)
      }
    }
    fetchPartsCount()
  }, [])

  const handleDeleteLine = (lineId: string, name: string) => {
    if ((partsCount[lineId] || 0) > 0) {
      alert('Сначала удалите все запчасти из этой линии')
      return
    }
    if (!confirm(`Удалить линию «${name}»? Все запчасти будут удалены.`)) return
    if (!id) return
    deleteLine.mutate({ id: lineId, workshopId: id })
  }

  const handleDeleteWorkshop = () => {
    if (!id) return
    if (lines.length > 0) {
      alert('Сначала удалите все линии из этого цеха')
      return
    }
    if (!confirm(`Удалить цех «${workshop?.name}»? Все линии и запчасти будут удалены.`)) return
    deleteWorkshop.mutate(id, {
      onSuccess: () => navigate('/'),
    })
  }

  return (
    <div>
      <Breadcrumb items={[{ label: workshop?.name || '...', path: `/workshop/${id}` }]} />
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl md:text-2xl font-bold truncate pr-2">{workshop?.name}</h2>
        <div className="flex gap-2 shrink-0">
          {isAdmin && (
            <>
              <button
                onClick={() => setEditingWorkshop(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">Редактировать</span>
              </button>
              <button
                onClick={handleDeleteWorkshop}
                className={`flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm ${lines.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Удалить цех</span>
              </button>
            </>
          )}
          <button
            onClick={() => setShowLineForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shrink-0"
          >
            <Plus className="w-4 h-4" />
            Линия
          </button>
        </div>
      </div>
      {lines.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Нет линий. Добавьте первую линию.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {lines.map((line) => (
            <div key={line.id} className="relative group">
              <Link
                to={`/line/${line.id}`}
                className="block p-5 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow active:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base truncate">{line.name}</h3>
                    {line.inventory_number && (
                      <p className="text-sm text-gray-500 mt-0.5">Инв. № {line.inventory_number}</p>
                    )}
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 shrink-0 ml-2" />
                </div>
              </Link>
              {isAdmin && (
                <button
                  onClick={() => handleDeleteLine(line.id, line.name)}
                  className={`absolute top-2 right-2 p-2 rounded-lg bg-white/80 text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity ${(partsCount[line.id] || 0) > 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {showLineForm && id && (
        <LineForm workshopId={id} onClose={() => setShowLineForm(false)} />
      )}
      {editingWorkshop && id && workshop && (
        <WorkshopForm
          initialData={{ id, name: workshop.name }}
          onClose={() => setEditingWorkshop(false)}
        />
      )}
    </div>
  )
}
