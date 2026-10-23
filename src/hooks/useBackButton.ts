import { useEffect } from 'react'
import { registerBackHandler } from '@/lib/backButton'

export function useBackButtonHandler(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return
    return registerBackHandler(() => {
      onClose()
      return true
    })
  }, [isOpen, onClose])
}
