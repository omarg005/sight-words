import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ParentNav from '@/components/parent/ParentNav'

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'parent') redirect('/admin')

  return (
    <div className="flex min-h-screen flex-col">
      <ParentNav />
      <main className="flex-1 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 p-4 sm:p-6">{children}</main>
    </div>
  )
}
