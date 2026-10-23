import { useContext } from 'react'
import { AuthContext, type AuthContextType } from '@/context/authContextDef'
import { AuthProvider } from '@/context/AuthProvider'

export { AuthProvider }
export type { AuthContextType }

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
