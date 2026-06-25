'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Invalid email or password.' }
  }

  // Look up the user's role to redirect appropriately
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users')
    .select('role, retired_at')
    .eq('id', user!.id)
    .single()

  if (profile?.retired_at) {
    await supabase.auth.signOut()
    return { error: 'This account has been deactivated. Please contact the administrator.' }
  }

  if (profile?.role === 'admin') {
    redirect('/admin')
  } else {
    redirect('/parent')
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// Used by admin to create parent accounts (service-role bypasses RLS)
export async function createParentAccount(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const adminClient = createAdminClient()

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'parent' },
  })

  if (error) {
    return { error: error.message }
  }

  return { userId: data.user.id }
}
