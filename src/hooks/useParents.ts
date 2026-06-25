'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Parent = { id: string; email: string }

export function useParents() {
  const [parents, setParents] = useState<Parent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('users')
      .select('id, email')
      .eq('role', 'parent')
      .is('retired_at', null)
      .order('email')
      .then(({ data }) => {
        setParents(data ?? [])
        setLoading(false)
      })
  }, [])

  return { parents, loading }
}
