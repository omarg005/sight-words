import { createClient } from '@/lib/supabase/server'
import AdminSettingsForms from './AdminSettingsForms'

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="max-w-md space-y-6">
      <a href="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        ← Dashboard
      </a>
      <AdminSettingsForms currentEmail={user?.email ?? ''} />
    </div>
  )
}
