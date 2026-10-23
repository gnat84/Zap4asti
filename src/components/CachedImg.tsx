import { useState, useEffect, useRef } from 'react'

const blobCache = new Map<string, string>()

interface CachedImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
}

export function CachedImg({ src, ...props }: CachedImgProps) {
  const [displaySrc, setDisplaySrc] = useState(blobCache.get(src) || src)
  const loadedRef = useRef(blobCache.has(src))

  useEffect(() => {
    if (loadedRef.current) return
    let cancelled = false
    fetch(src)
      .then(r => r.blob())
      .then(blob => {
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        blobCache.set(src, url)
        loadedRef.current = true
        setDisplaySrc(url)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [src])

  return <img src={displaySrc} {...props} />
}
