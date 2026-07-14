import { createClient } from '@/utils/supabase/server'
import { PermissionKey } from '@/lib/permissions/catalog'
import { redirect } from 'next/navigation'

export type AuthContext = {
  user: {
    id: string
    email: string
  }
  workspace: {
    id: string
    role: 'owner' | 'admin' | 'member'
  }
  memberships: Array<{
    company_id: string
    role: string
  }>
  hasPermission: (key: PermissionKey, companyId: string) => Promise<boolean>
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Get workspace membership
  const { data: wsMember } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspace_role')
    .eq('user_id', user.id)
    .single()

  if (!wsMember) return null

  // Get company memberships
  const { data: memberships } = await supabase
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')

  const hasPermission = async (key: PermissionKey, companyId: string) => {
    const { data, error } = await supabase.rpc('resolve_permission', {
      p_user_id: user.id,
      p_company_id: companyId,
      p_permission_key: key
    })
    
    if (error) {
      console.error('Error resolving permission:', error)
      return false
    }
    
    return data as boolean
  }

  return {
    user: {
      id: user.id,
      email: user.email!,
    },
    workspace: {
      id: wsMember.workspace_id,
      role: wsMember.workspace_role as 'owner' | 'admin' | 'member'
    },
    memberships: memberships || [],
    hasPermission
  }
}

/**
 * Validates authentication and optionally authorization.
 * Use this at the top of Server Actions or Route Handlers.
 * 
 * @param options.permission Optional permission key to check
 * @param options.companyId Required if checking a permission (to know WHICH company to check against)
 * @param options.redirectTo Defaults to '/login' if not logged in, or throws error if no access
 */
export async function requireAuth(options?: {
  permission?: PermissionKey
  companyId?: string
  redirectTo?: string
}): Promise<AuthContext> {
  const ctx = await getAuthContext()
  
  if (!ctx) {
    if (options?.redirectTo !== null) {
      redirect(options?.redirectTo || '/login')
    }
    throw new Error('Not authenticated')
  }

  if (options?.permission) {
    if (!options.companyId) {
      throw new Error('companyId is required when checking a permission')
    }
    
    const granted = await ctx.hasPermission(options.permission, options.companyId)
    if (!granted) {
      throw new Error('Unauthorized: missing permission ' + options.permission)
    }
  }

  return ctx
}
