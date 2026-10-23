import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  path: string
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[]
}

export function Breadcrumb({ items = [] }: BreadcrumbProps) {
  const location = useLocation()
  const pathParts = location.pathname.split('/').filter(Boolean)

  const autoItems: BreadcrumbItem[] = pathParts.map((part, index) => ({
    label: decodeURIComponent(part),
    path: '/' + pathParts.slice(0, index + 1).join('/'),
  }))

  const displayItems = items.length > 0 ? items : autoItems

  return (
    <nav className="flex items-center text-sm text-gray-500 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
      <Link to="/" className="hover:text-gray-700 flex items-center shrink-0">
        <Home className="w-4 h-4" />
      </Link>
      {displayItems.map((item, index) => (
        <span key={item.path} className="flex items-center shrink-0">
          <ChevronRight className="w-4 h-4 mx-1 shrink-0" />
          {index === displayItems.length - 1 ? (
            <span className="text-gray-900 font-medium truncate max-w-[150px]">{item.label}</span>
          ) : (
            <Link to={item.path} className="hover:text-gray-700 truncate max-w-[120px]">
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
