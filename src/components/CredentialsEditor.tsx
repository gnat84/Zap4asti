import { Plus, Trash2 } from 'lucide-react'

export interface Credential {
  name: string
  login: string
  password: string
}

interface CredentialsEditorProps {
  credentials: Credential[]
  onChange: (credentials: Credential[]) => void
}

export function CredentialsEditor({ credentials, onChange }: CredentialsEditorProps) {
  const add = () => onChange([...credentials, { name: '', login: '', password: '' }])

  const remove = (index: number) => {
    onChange(credentials.filter((_, i) => i !== index))
  }

  const update = (index: number, field: keyof Credential, value: string) => {
    onChange(credentials.map((c, i) => i === index ? { ...c, [field]: value } : c))
  }

  return (
    <div className="space-y-3">
      {credentials.map((cred, i) => (
        <div key={i} className="p-3 bg-gray-50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Запись {i + 1}</span>
            <button type="button" onClick={() => remove(i)} className="p-1 text-red-400 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Имя (напр. Оператор)"
            value={cred.name}
            onChange={(e) => update(i, 'name', e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Логин"
            value={cred.login}
            onChange={(e) => update(i, 'login', e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Пароль"
            value={cred.password}
            onChange={(e) => update(i, 'password', e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <Plus className="w-4 h-4" /> Добавить запись
      </button>
    </div>
  )
}
