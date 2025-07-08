'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useUser, useSessionContext } from '@supabase/auth-helpers-react'

export default function requireAuth<P>(Component: React.ComponentType<P>) {
  return function RequireAuth(props: P) {
    const router = useRouter()
    const { isLoading } = useSessionContext()
    const user = useUser()

    useEffect(() => {
      if (!isLoading && !user) {
        router.push('/login')
      }
    }, [isLoading, user, router])

    if (!user) {
      return null
    }

    return <Component {...props} />
  }
}
