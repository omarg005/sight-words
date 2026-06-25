'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') throw new Error('Forbidden')
  return supabase
}

export async function createStudent(formData: FormData) {
  const supabase = await assertAdmin()
  const parentId = formData.get('parentId') as string
  const displayName = (formData.get('displayName') as string).trim()
  const gradeLevel = (formData.get('gradeLevel') as string).trim() || null

  if (!parentId) return { error: 'A parent account must be selected.' }
  if (!displayName) return { error: 'Student name is required.' }

  const { error } = await supabase
    .from('students')
    .insert({ parent_id: parentId, display_name: displayName, grade_level: gradeLevel })
  if (error) return { error: error.message }

  revalidatePath('/admin/students')
  return { success: true }
}

export async function updateStudent(formData: FormData) {
  const supabase = await assertAdmin()
  const studentId = formData.get('studentId') as string
  const displayName = (formData.get('displayName') as string).trim()
  const gradeLevel = (formData.get('gradeLevel') as string).trim() || null
  const parentId = formData.get('parentId') as string

  if (!displayName) return { error: 'Student name is required.' }

  const { error } = await supabase
    .from('students')
    .update({ display_name: displayName, grade_level: gradeLevel, parent_id: parentId })
    .eq('id', studentId)
  if (error) return { error: error.message }

  revalidatePath('/admin/students')
  return { success: true }
}

export async function retireStudent(formData: FormData) {
  const supabase = await assertAdmin()
  const studentId = formData.get('studentId') as string

  const { error } = await supabase
    .from('students')
    .update({ retired_at: new Date().toISOString() })
    .eq('id', studentId)
  if (error) return { error: error.message }

  revalidatePath('/admin/students')
  return { success: true }
}

export async function reactivateStudent(formData: FormData) {
  const supabase = await assertAdmin()
  const studentId = formData.get('studentId') as string

  const { error } = await supabase
    .from('students')
    .update({ retired_at: null })
    .eq('id', studentId)
  if (error) return { error: error.message }

  revalidatePath('/admin/students')
  return { success: true }
}

export async function deleteStudent(formData: FormData) {
  const supabase = await assertAdmin()
  const studentId = formData.get('studentId') as string

  const { count } = await supabase
    .from('progress_events')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)

  if ((count ?? 0) > 0) {
    return { error: 'This student has recorded progress. Retire instead of deleting.' }
  }

  const { error } = await supabase.from('students').delete().eq('id', studentId)
  if (error) return { error: error.message }

  revalidatePath('/admin/students')
  return { success: true }
}
