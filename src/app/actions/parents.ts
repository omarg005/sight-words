'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') throw new Error('Forbidden')
  return supabase
}

export async function createParent(formData: FormData) {
  await assertAdmin()
  const email = (formData.get('email') as string).trim()
  const password = formData.get('password') as string

  if (!email || !password) return { error: 'Email and password are required.' }
  if (password.length < 6) return { error: 'Password must be at least 6 characters.' }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'parent' },
  })
  if (error) return { error: error.message }

  revalidatePath('/admin/parents')
  return { userId: data.user.id }
}

export async function updateParentPassword(formData: FormData) {
  await assertAdmin()
  const userId = formData.get('userId') as string
  const password = formData.get('password') as string

  if (!password || password.length < 6) return { error: 'Password must be at least 6 characters.' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) return { error: error.message }

  revalidatePath('/admin/parents')
  return { success: true }
}

export async function retireParent(formData: FormData) {
  const supabase = await assertAdmin()
  const userId = formData.get('userId') as string

  const { error } = await supabase
    .from('users')
    .update({ retired_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) return { error: error.message }

  revalidatePath('/admin/parents')
  return { success: true }
}

export async function reactivateParent(formData: FormData) {
  const supabase = await assertAdmin()
  const userId = formData.get('userId') as string

  const { error } = await supabase
    .from('users')
    .update({ retired_at: null })
    .eq('id', userId)
  if (error) return { error: error.message }

  revalidatePath('/admin/parents')
  return { success: true }
}

export async function deleteParent(formData: FormData) {
  const supabase = await assertAdmin()
  const userId = formData.get('userId') as string

  // Guard: only hard-delete if this parent's students have no progress
  const { data: students } = await supabase
    .from('students')
    .select('id')
    .eq('parent_id', userId)

  if (students && students.length > 0) {
    const studentIds = students.map((s) => s.id)
    const { count } = await supabase
      .from('progress_events')
      .select('id', { count: 'exact', head: true })
      .in('student_id', studentIds)

    if ((count ?? 0) > 0) {
      return { error: 'This parent has students with recorded progress. Retire instead of deleting.' }
    }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  revalidatePath('/admin/parents')
  return { success: true }
}
