// app/api/documents/[id]/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { BUCKET_NAME, SIGNED_URL_EXPIRY_SECONDS } from '@/utils/documents/storage';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ── Authenticate ─────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Fetch document metadata ───────────────────────────────────────
    const { data: doc, error: docError } = await supabaseAdmin
      .from('client_documents')
      .select('id, client_id, file_name, storage_path, is_deleted')
      .eq('id', id)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    if (doc.is_deleted) {
      return NextResponse.json({ error: 'This document has been deleted.' }, { status: 410 });
    }

    // ── Verify client exists (guards against enumeration) ────────────
    const { data: clientRow } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', doc.client_id)
      .single();

    if (!clientRow) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    // ── Generate signed URL (server-side only, expires in 1 hour) ────
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(doc.storage_path, SIGNED_URL_EXPIRY_SECONDS, {
        download: doc.file_name, // Forces Content-Disposition: attachment with original filename
      });

    if (signedError || !signedData?.signedUrl) {
      console.error('[Documents/Download] Signed URL error:', signedError);
      return NextResponse.json({ error: 'Could not generate download link.' }, { status: 500 });
    }

    // ── Audit log (non-blocking) ─────────────────────────────────────
    void (async () => {
      try {
        await supabaseAdmin.from('document_audit_log').insert({
          document_id:  doc.id,
          client_id:    doc.client_id,
          user_id:      user.id,
          action:       'download',
        });
      } catch (e) { console.error('[Audit] download log failed:', e); }
    })();

    return NextResponse.json({
      signedUrl: signedData.signedUrl,
      fileName:  doc.file_name,
      expiresIn: SIGNED_URL_EXPIRY_SECONDS,
    });

  } catch (err) {
    console.error('[Documents/Download] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
