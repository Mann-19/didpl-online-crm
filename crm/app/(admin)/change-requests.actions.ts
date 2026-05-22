'use server'

/**
 * change-requests.actions.ts
 *
 * Central module for the Review-Based Approval System.
 *
 * USAGE PATTERN for employees:
 *   Instead of calling `supabase.from('clients').update(...)` directly,
 *   employees call `submitChangeRequest(...)` which writes to `pending_changes`.
 *
 * Master Admin then reviews at /admin/approvals and calls `approveChange` or `rejectChange`.
 * On approval, `applyApprovedChange` executes the actual DB mutation.
 */

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export type EntityType =
  | 'client'
  | 'consultant'
  | 'booking'
  | 'payment'
  | 'expense'
  | 'plot'

export type Operation = 'create' | 'update' | 'delete'

export interface PendingChange {
  id: string
  submitted_by: string
  submitted_at: string
  entity_type: EntityType
  entity_id: string | null
  operation: Operation
  payload: Record<string, any>
  description: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  // Joined from profiles
  submitter_name?: string
  reviewer_name?: string
}

export interface ChangeRequestResult {
  success: boolean
  error?: string
  changeId?: string
}

// ─── Role check helper ─────────────────────────────────────────────────────────

async function getCurrentUserRole(): Promise<{ userId: string; role: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return { userId: user.id, role: profile?.role || 'employee' }
}

// ─── 1. Submit a change request (called by employees) ─────────────────────────

export async function submitChangeRequest(params: {
  entity_type: EntityType
  entity_id?: string
  operation: Operation
  payload: Record<string, any>
  description: string
}): Promise<ChangeRequestResult> {
  const supabase = await createClient()
  const userInfo = await getCurrentUserRole()
  if (!userInfo) return { success: false, error: 'Not authenticated' }

  const { error, data } = await supabase
    .from('pending_changes')
    .insert([{
      submitted_by: userInfo.userId,
      entity_type: params.entity_type,
      entity_id: params.entity_id || null,
      operation: params.operation,
      payload: params.payload,
      description: params.description,
      status: 'pending',
    }])
    .select('id')
    .single()

  if (error) {
    console.error('submitChangeRequest error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/approvals')
  return { success: true, changeId: data.id }
}

// ─── 2. Get all pending changes (admin review panel) ──────────────────────────

export async function getPendingChanges(
  statusFilter: 'pending' | 'approved' | 'rejected' | 'all' = 'pending'
): Promise<PendingChange[]> {
  const supabase = await createClient()

  let query = supabase
    .from('pending_changes')
    .select(`
      *,
      submitter:submitted_by ( full_name ),
      reviewer:reviewed_by ( full_name )
    `)
    .order('submitted_at', { ascending: false })

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query

  if (error) {
    console.error('getPendingChanges error:', error)
    return []
  }

  return (data || []).map((row: any) => ({
    ...row,
    submitter_name: row.submitter?.full_name || 'Unknown',
    reviewer_name: row.reviewer?.full_name || null,
  }))
}

// ─── 3. Get pending count for sidebar badge ────────────────────────────────────

export async function getPendingChangesCount(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('pending_changes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (error) return 0
  return count || 0
}

// ─── 4. Approve a change (master admin only) ──────────────────────────────────

export async function approveChange(changeId: string): Promise<ChangeRequestResult> {
  const supabase = await createClient()
  const userInfo = await getCurrentUserRole()

  if (!userInfo || !['admin', 'master_admin'].includes(userInfo.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  // Fetch the change record
  const { data: change, error: fetchError } = await supabase
    .from('pending_changes')
    .select('*')
    .eq('id', changeId)
    .eq('status', 'pending')
    .single()

  if (fetchError || !change) {
    return { success: false, error: 'Change request not found or already reviewed' }
  }

  // Apply the actual DB mutation
  const applyResult = await applyApprovedChange(change as PendingChange)
  if (!applyResult.success) {
    return { success: false, error: `DB apply failed: ${applyResult.error}` }
  }

  // Mark as approved
  const { error: updateError } = await supabase
    .from('pending_changes')
    .update({
      status: 'approved',
      reviewed_by: userInfo.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', changeId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  revalidatePath('/admin/approvals')
  revalidatePath('/clients/list')
  revalidatePath('/consultants/list')
  revalidatePath('/projects')
  return { success: true }
}

// ─── 5. Reject a change (master admin only) ───────────────────────────────────

export async function rejectChange(
  changeId: string,
  reason: string
): Promise<ChangeRequestResult> {
  const supabase = await createClient()
  const userInfo = await getCurrentUserRole()

  if (!userInfo || !['admin', 'master_admin'].includes(userInfo.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('pending_changes')
    .update({
      status: 'rejected',
      reviewed_by: userInfo.userId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', changeId)
    .eq('status', 'pending')

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/approvals')
  return { success: true }
}

// ─── 6. Apply an approved change to the real DB ───────────────────────────────

async function applyApprovedChange(change: PendingChange): Promise<ChangeRequestResult> {
  const supabase = await createClient()
  const { entity_type, entity_id, operation, payload } = change

  // Map entity type to Supabase table name
  const tableMap: Record<EntityType, string> = {
    client:     'clients',
    consultant: 'consultants',
    booking:    'bookings',
    payment:    'payments',
    expense:    'expenses',
    plot:       'plots',
  }

  const table = tableMap[entity_type]
  if (!table) return { success: false, error: `Unknown entity type: ${entity_type}` }

  let error: any = null

  if (operation === 'create') {
    const result = await supabase.from(table).insert([payload])
    error = result.error
  } else if (operation === 'update') {
    if (!entity_id) return { success: false, error: 'entity_id required for update' }
    
    // SPECIAL HANDLING for Booking side-effects
    if (entity_type === 'booking') {
      if (payload.status === 'confirmed') {
        const { data: b } = await supabase.from('bookings').select('plot_id, client_id').eq('id', entity_id).single()
        if (b) {
          const { confirmBooking } = await import('./plots.actions')
          const res = await confirmBooking(entity_id, b.plot_id, b.client_id)
          if (!res.success) return res
        }
      } else if (payload.status === 'pending') {
        const { data: b } = await supabase.from('bookings').select('plot_id').eq('id', entity_id).single()
        if (b) {
          const { revertBooking } = await import('./plots.actions')
          const res = await revertBooking(entity_id, b.plot_id)
          if (!res.success) return res
        }
      } else if (payload.plot_id) {
        // Transfer plot
        const { transferBooking } = await import('./plots.actions')
        const res = await transferBooking(entity_id, payload.plot_id)
        if (!res.success) return res
      }
    }
    
    // Proceed with regular update (this may be redundant for confirmed/pending but harmless)
    const result = await supabase.from(table).update(payload).eq('id', entity_id)
    error = result.error
  } else if (operation === 'delete') {
    if (!entity_id) return { success: false, error: 'entity_id required for delete' }
    
    // SPECIAL HANDLING for Booking cancellation
    if (entity_type === 'booking') {
      const { data: b } = await supabase.from('bookings').select('plot_id').eq('id', entity_id).single()
      if (b) {
        const { cancelBooking } = await import('./plots.actions')
        const res = await cancelBooking(entity_id, b.plot_id)
        if (!res.success) return res
        return { success: true } // cancelBooking deletes it
      }
    }

    const result = await supabase.from(table).delete().eq('id', entity_id)
    error = result.error
  }

  if (error) {
    console.error('applyApprovedChange error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ─── 7. Get changes for a specific employee (their submission history) ─────────

export async function getMyChangeRequests(): Promise<PendingChange[]> {
  const supabase = await createClient()
  const userInfo = await getCurrentUserRole()
  if (!userInfo) return []

  const { data, error } = await supabase
    .from('pending_changes')
    .select('*')
    .eq('submitted_by', userInfo.userId)
    .order('submitted_at', { ascending: false })
    .limit(50)

  if (error) return []
  return data || []
}
