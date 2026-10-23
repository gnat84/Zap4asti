import { Download } from 'lucide-react'

interface VersionUpdateBannerProps {
  version: string
  fileUrl: string
}

export function VersionUpdateBanner({ version, fileUrl }: VersionUpdateBannerProps) {
  return (
    <div className="mx-3 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-sm font-medium text-blue-800 mb-2">
        Доступно обновление v{version}
      </p>
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 justify-center"
      >
        <Download className="w-4 h-4" />
        Скачать
      </a>
    </div>
  )
}
