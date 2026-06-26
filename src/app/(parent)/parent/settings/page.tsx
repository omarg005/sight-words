import { createClient } from '@/lib/supabase/server'
import ParentSettingsForms from './ParentSettingsForms'

export default async function ParentSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="mx-auto max-w-md space-y-6">
      <a href="/parent" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        ← Dashboard
      </a>
      <ParentSettingsForms currentEmail={user?.email ?? ''} />
    </div>
  )
}
