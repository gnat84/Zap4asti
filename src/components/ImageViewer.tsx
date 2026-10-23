import { useState, useRef, useCallback } from 'react'
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

interface ImageViewerProps {
  src: string
  onClose: () => void
}

export function ImageViewer({ src, onClose }: ImageViewerProps) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const gestureRef = useRef({
    pinching: false,
    startDist: 0,
    startScale: 1,
    startCenter: { x: 0, y: 0 },
    startOffset: { x: 0, y: 0 },
    panning: false,
    panStart: { x: 0, y: 0 },
    panStartOffset: { x: 0, y: 0 },
  })

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const g = gestureRef.current
    if (e.touches.length === 2) {
      const t0 = e.touches[0], t1 = e.touches[1]
      const dx = t0.clientX - t1.clientX, dy = t0.clientY - t1.clientY
      g.pinching = true
      g.startDist = Math.sqrt(dx * dx + dy * dy)
      g.startScale = scale
      g.startCenter = { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 }
      g.startOffset = { ...offset }
    } else if (e.touches.length === 1 && scale > 1) {
      g.panning = true
      g.panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      g.panStartOffset = { ...offset }
    }
  }, [scale, offset])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const g = gestureRef.current
    if (g.pinching && e.touches.length === 2) {
      e.preventDefault()
      const t0 = e.touches[0], t1 = e.touches[1]
      const dx = t0.clientX - t1.clientX, dy = t0.clientY - t1.clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const center = { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 }

      const newScale = Math.min(Math.max(g.startScale * (dist / g.startDist), 1), 5)
      setScale(newScale)

      setOffset({
        x: g.startOffset.x + (center.x - g.startCenter.x),
        y: g.startOffset.y + (center.y - g.startCenter.y),
      })
    } else if (g.panning && e.touches.length === 1) {
      const t = e.touches[0]
      setOffset({
        x: g.panStartOffset.x + (t.clientX - g.panStart.x),
        y: g.panStartOffset.y + (t.clientY - g.panStart.y),
      })
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    const g = gestureRef.current
    g.pinching = false
    g.panning = false
    setScale(prev => {
      if (prev <= 1) {
        setOffset({ x: 0, y: 0 })
      }
      return prev
    })
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    setScale(prev => {
      const next = Math.min(Math.max(prev * factor, 1), 5)
      if (next <= 1) setOffset({ x: 0, y: 0 })
      return next
    })
  }, [])

  const resetView = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <button
        onClick={onClose}
        className="absolute right-4 text-white hover:text-gray-300 z-10 p-2"
        style={{ top: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <X className="w-8 h-8" />
      </button>

      <div
        className="absolute left-4 flex gap-2 z-10"
        style={{ top: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <button onClick={() => setScale(p => Math.min(p * 1.3, 5))} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 text-white" title="Приблизить">
          <ZoomIn className="w-5 h-5" />
        </button>
        <button onClick={() => setScale(p => { const n = Math.max(p / 1.3, 1); if (n <= 1) setOffset({ x: 0, y: 0 }); return n })} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 text-white" title="Отдалить">
          <ZoomOut className="w-5 h-5" />
        </button>
        <button onClick={resetView} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 text-white" title="Сбросить">
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {scale > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm z-10">
          {Math.round(scale * 100)}%
        </div>
      )}

      <div
        className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <img
          src={src}
          alt="Просмотр"
          className="max-w-[90vw] max-h-[90vh] object-contain select-none"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: gestureRef.current.pinching || gestureRef.current.panning ? 'none' : 'transform 0.1s ease-out',
          }}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  )
}
