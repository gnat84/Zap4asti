type BackHandler = () => boolean | void

const handlers: BackHandler[] = []

export function registerBackHandler(handler: BackHandler): () => void {
  handlers.push(handler)
  return () => {
    const idx = handlers.lastIndexOf(handler)
    if (idx !== -1) {
      handlers.splice(idx, 1)
    }
  }
}

export function handleBack(): boolean {
  for (let i = handlers.length - 1; i >= 0; i--) {
    const fn = handlers[i]
    if (fn) {
      const result = fn()
      if (result !== false) {
        return true
      }
    }
  }
  return false
}
