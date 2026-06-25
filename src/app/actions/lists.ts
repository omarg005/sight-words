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

export async function createList(formData: FormData) {
  const supabase = await assertAdmin()
  const name = (formData.get('name') as string).trim()
  const gradeLevel = (formData.get('gradeLevel') as string).trim()

  if (!name) return { error: 'List name is required.' }
  if (!gradeLevel) return { error: 'Grade level is required.' }

  // Look up the sight_words activity id
  const { data: activity } = await supabase
    .from('activities')
    .select('id')
    .eq('type', 'sight_words')
    .single()

  if (!activity) return { error: 'Sight words activity not found. Run the schema migration.' }

  const { data, error } = await supabase
    .from('sight_word_lists')
    .insert({ name, grade_level: gradeLevel, activity_id: activity.id })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/lists')
  return { listId: data.id }
}

export async function updateList(formData: FormData) {
  const supabase = await assertAdmin()
  const listId = formData.get('listId') as string
  const name = (formData.get('name') as string).trim()
  const gradeLevel = (formData.get('gradeLevel') as string).trim()

  if (!name) return { error: 'List name is required.' }
  if (!gradeLevel) return { error: 'Grade level is required.' }

  const { error } = await supabase
    .from('sight_word_lists')
    .update({ name, grade_level: gradeLevel })
    .eq('id', listId)

  if (error) return { error: error.message }

  revalidatePath('/admin/lists')
  revalidatePath(`/admin/lists/${listId}`)
  return { success: true }
}

export async function retireList(formData: FormData) {
  const supabase = await assertAdmin()
  const listId = formData.get('listId') as string
  const { error } = await supabase
    .from('sight_word_lists')
    .update({ retired_at: new Date().toISOString() })
    .eq('id', listId)
  if (error) return { error: error.message }
  revalidatePath('/admin/lists')
  return { success: true }
}

export async function reactivateList(formData: FormData) {
  const supabase = await assertAdmin()
  const listId = formData.get('listId') as string
  const { error } = await supabase
    .from('sight_word_lists')
    .update({ retired_at: null })
    .eq('id', listId)
  if (error) return { error: error.message }
  revalidatePath('/admin/lists')
  return { success: true }
}

export async function deleteList(formData: FormData) {
  const supabase = await assertAdmin()
  const listId = formData.get('listId') as string

  // Block delete if any progress references this list
  const { count } = await supabase
    .from('progress_events')
    .select('id', { count: 'exact', head: true })
    .in(
      'word_id',
      (await supabase.from('sight_words').select('id').eq('list_id', listId)).data?.map((w) => w.id) ?? []
    )

  if ((count ?? 0) > 0)
    return { error: 'This list has student progress. Retire it instead of deleting.' }

  const { count: compCount } = await supabase
    .from('list_completions')
    .select('id', { count: 'exact', head: true })
    .eq('list_id', listId)

  if ((compCount ?? 0) > 0)
    return { error: 'This list has completion records. Retire it instead of deleting.' }

  const { error } = await supabase.from('sight_word_lists').delete().eq('id', listId)
  if (error) return { error: error.message }
  revalidatePath('/admin/lists')
  return { success: true }
}

// ── Words ────────────────────────────────────────────────────────────────────

export async function addWord(formData: FormData) {
  const supabase = await assertAdmin()
  const admin = createAdminClient()

  const listId = formData.get('listId') as string
  const word = (formData.get('word') as string).trim().toLowerCase()
  const imageFile = formData.get('image') as File | null

  if (!word) return { error: 'Word is required.' }

  // Check duplicate within list
  const { data: existing } = await supabase
    .from('sight_words')
    .select('id')
    .eq('list_id', listId)
    .ilike('word', word)
    .is('retired_at', null)

  if (existing && existing.length > 0)
    return { error: `"${word}" is already in this list.` }

  // Determine next display_order
  const { data: maxRow } = await supabase
    .from('sight_words')
    .select('display_order')
    .eq('list_id', listId)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  const displayOrder = ((maxRow?.display_order as number | null) ?? 0) + 1

  let imageUrl: string | null = null

  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split('.').pop()
    const path = `${listId}/${Date.now()}-${word}.${ext}`
    const { error: uploadErr } = await admin.storage
      .from('word-images')
      .upload(path, imageFile, { upsert: true })
    if (uploadErr) return { error: `Image upload failed: ${uploadErr.message}` }
    imageUrl = path
  }

  const { error } = await supabase
    .from('sight_words')
    .insert({ list_id: listId, word, image_url: imageUrl, display_order: displayOrder })

  if (error) return { error: error.message }

  revalidatePath(`/admin/lists/${listId}`)
  return { success: true }
}

export async function updateWordImage(formData: FormData) {
  const supabase = await assertAdmin()
  const admin = createAdminClient()

  const wordId = formData.get('wordId') as string
  const listId = formData.get('listId') as string
  const imageFile = formData.get('image') as File

  if (!imageFile || imageFile.size === 0) return { error: 'No image selected.' }

  const ext = imageFile.name.split('.').pop()
  const path = `${listId}/${wordId}.${ext}`

  const { error: uploadErr } = await admin.storage
    .from('word-images')
    .upload(path, imageFile, { upsert: true })
  if (uploadErr) return { error: `Image upload failed: ${uploadErr.message}` }

  const { error } = await supabase
    .from('sight_words')
    .update({ image_url: path })
    .eq('id', wordId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/lists/${listId}`)
  return { success: true }
}

export async function retireWord(formData: FormData) {
  const supabase = await assertAdmin()
  const wordId = formData.get('wordId') as string
  const listId = formData.get('listId') as string
  const { error } = await supabase
    .from('sight_words')
    .update({ retired_at: new Date().toISOString() })
    .eq('id', wordId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/lists/${listId}`)
  return { success: true }
}

export async function reactivateWord(formData: FormData) {
  const supabase = await assertAdmin()
  const wordId = formData.get('wordId') as string
  const listId = formData.get('listId') as string
  const { error } = await supabase
    .from('sight_words')
    .update({ retired_at: null })
    .eq('id', wordId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/lists/${listId}`)
  return { success: true }
}

export async function deleteWord(formData: FormData) {
  const supabase = await assertAdmin()
  const wordId = formData.get('wordId') as string
  const listId = formData.get('listId') as string

  const { count } = await supabase
    .from('progress_events')
    .select('id', { count: 'exact', head: true })
    .eq('word_id', wordId)

  if ((count ?? 0) > 0)
    return { error: 'This word has student progress. Retire it instead.' }

  const { error } = await supabase.from('sight_words').delete().eq('id', wordId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/lists/${listId}`)
  return { success: true }
}

export async function bulkAddWords(
  listId: string,
  words: { word: string; image_url: string | null }[]
) {
  const supabase = await assertAdmin()

  const { data: maxRow } = await supabase
    .from('sight_words')
    .select('display_order')
    .eq('list_id', listId)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  let nextOrder = ((maxRow?.display_order as number | null) ?? 0) + 1

  const rows = words.map((w) => ({
    list_id: listId,
    word: w.word.toLowerCase(),
    image_url: w.image_url || null,
    display_order: nextOrder++,
  }))

  const { error } = await supabase.from('sight_words').insert(rows)
  if (error) return { error: error.message }

  revalidatePath(`/admin/lists/${listId}`)
  return { success: true }
}

// ── Assignments ──────────────────────────────────────────────────────────────

export async function createAssignment(formData: FormData) {
  const supabase = await assertAdmin()
  const listId = formData.get('listId') as string
  const studentId = formData.get('studentId') as string
  const inputMode = formData.get('inputMode') as string
  const requiredCompletions = Math.max(1, parseInt(formData.get('requiredCompletions') as string) || 1)

  if (!studentId) return { error: 'Please select a student.' }
  if (!inputMode) return { error: 'Please select an input mode.' }

  const { error } = await supabase
    .from('assignments')
    .insert({ list_id: listId, student_id: studentId, input_mode: inputMode, required_completions: requiredCompletions })

  if (error) {
    if (error.code === '23505') return { error: 'This list is already assigned to that student.' }
    return { error: error.message }
  }

  revalidatePath(`/admin/lists/${listId}`)
  revalidatePath(`/admin/students/${studentId}`)
  return { success: true }
}

export async function deleteAssignment(formData: FormData) {
  const supabase = await assertAdmin()
  const assignmentId = formData.get('assignmentId') as string
  const listId = formData.get('listId') as string
  const studentId = formData.get('studentId') as string

  const { error } = await supabase.from('assignments').delete().eq('id', assignmentId)
  if (error) return { error: error.message }

  if (listId) revalidatePath(`/admin/lists/${listId}`)
  if (studentId) revalidatePath(`/admin/students/${studentId}`)
  return { success: true }
}
