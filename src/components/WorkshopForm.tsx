import { useState } from 'react'
import { useCreateWorkshop, useUpdateWorkshop } from '@/hooks/useWorkshops'
import { X } from 'lucide-react'

interface WorkshopFormProps {
  onClose: () => void
  initialData?: { id: string; name: string }
}

export function WorkshopForm({ onClose, initialData }: WorkshopFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [error, setError] = useState('')
  const createWorkshop = useCreateWorkshop()
  const updateWorkshop = useUpdateWorkshop()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (initialData) {
      updateWorkshop.mutate(
        { id: initialData.id, name },
        {
          onSuccess: () => onClose(),
          onError: (e) => setError(e.message),
        }
      )
    } else {
      createWorkshop.mutate(name, {
        onSuccess: () => onClose(),
        onError: (e) => setError(e.message),
      })
    }
  }

  const isLoading = createWorkshop.isPending || updateWorkshop.isPending

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-lg p-6 w-full sm:max-w-md sm:m-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {initialData ? 'Редактировать цех' : 'Новый цех'}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              required
              autoFocus
            />
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
              disabled={isLoading}
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
