import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useWorkshops, useDeleteWorkshop } from '@/hooks/useWorkshops'
import { supabase } from '@/lib/supabase'
import { Factory, Plus, Trash2 } from 'lucide-react'
import { WorkshopForm } from '@/components/WorkshopForm'
import { useBackButtonHandler } from '@/hooks/useBackButton'

export function DashboardPage() {
  const [showForm, setShowForm] = useState(false)
  const [linesCount, setLinesCount] = useState<Record<string, number>>({})
  const { isAdmin } = useAuth()
  const { data: workshops = [], isLoading } = useWorkshops()
  const deleteWorkshop = useDeleteWorkshop()

  useBackButtonHandler(showForm, () => setShowForm(false))

  useEffect(() => {
    const fetchLinesCount = async () => {
      const { data } = await supabase
        .from('lines')
        .select('workshop_id')
      if (data) {
        const counts: Record<string, number> = {}
        data.forEach((line) => {
          counts[line.workshop_id] = (counts[line.workshop_id] || 0) + 1
        })
        setLinesCount(counts)
      }
    }
    fetchLinesCount()
  }, [])

  const handleDelete = (id: string, name: string) => {
    if ((linesCount[id] || 0) > 0) {
      alert('Сначала удалите все линии из этого цеха')
      return
    }
    if (!confirm(`Удалить цех «${name}»? Все линии и запчасти будут удалены.`)) return
    deleteWorkshop.mutate(id)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl md:text-2xl font-bold">Цеха</h2>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Новый цех
        </button>
      </div>
      {isLoading ? (
        <div className="text-center py-16">
          <p className="text-gray-400">Загрузка...</p>
        </div>
      ) : workshops.length === 0 ? (
        <div className="text-center py-16">
          <Factory className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Нет цехов. Создайте первый цех.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {workshops.map((workshop) => (
            <div key={workshop.id} className="relative group">
              <Link
                to={`/workshop/${workshop.id}`}
                className="block p-5 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow active:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <Factory className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base truncate">{workshop.name}</h3>
                  </div>
                </div>
              </Link>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(workshop.id, workshop.name)}
                  className={`absolute top-2 right-2 p-2 rounded-lg bg-white/80 text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity ${(linesCount[workshop.id] || 0) > 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <WorkshopForm
          onClose={() => {
            setShowForm(false)
          }}
        />
      )}
    </div>
  )
}
