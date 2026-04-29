import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
    const supabase = await createClient()
    const { count } = await supabase
        .from('pending_changes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

    return NextResponse.json({ count: count || 0 })
}