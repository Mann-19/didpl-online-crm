// app/api/documents/route.ts
// GET: List documents for a client with pagination, filtering, and search
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    // ── Authenticate ─────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Parse query params ───────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('client_id');
    const bookingId = searchParams.get('booking_id');
    const search   = searchParams.get('search')  ?? '';
    const type     = searchParams.get('type')    ?? '';
    const page     = Math.max(1, parseInt(searchParams.get('page')  ?? '1'));
    const limit    = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
    const offset   = (page - 1) * limit;

    if (!clientId) {
      return NextResponse.json({ error: 'client_id is required.' }, { status: 400 });
    }

    // ── Verify client exists ─────────────────────────────────────────
    const { data: clientRow } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .single();

    if (!clientRow) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    // ── Build query ──────────────────────────────────────────────────
    let query = supabaseAdmin
      .from('client_documents')
      .select(
        'id, file_name, file_size, mime_type, document_type, description, uploaded_by, uploaded_at',
        { count: 'exact' }
      )
      .eq('client_id', clientId)
      .eq('is_deleted', false)
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (bookingId) query = query.eq('booking_id', bookingId);
    if (type)   query = query.eq('document_type', type);
    if (search) query = query.ilike('file_name', `%${search}%`);

    const { data: documents, count, error } = await query;

    if (error) {
      console.error('[Documents/List] DB error:', error);
      return NextResponse.json({ error: 'Failed to fetch documents.' }, { status: 500 });
    }

    return NextResponse.json({
      documents: documents ?? [],
      pagination: {
        page,
        limit,
        total:    count ?? 0,
        hasMore:  offset + limit < (count ?? 0),
      },
    });

  } catch (err) {
    console.error('[Documents/List] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
