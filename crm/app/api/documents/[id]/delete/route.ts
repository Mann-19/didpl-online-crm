// app/api/documents/[id]/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { BUCKET_NAME } from '@/utils/documents/storage';

export async function DELETE(
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

    // ── Fetch role ────────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const role = profile?.role ?? 'employee';

    // ── Parse hard delete flag (admin only) ───────────────────────────
    const { searchParams } = new URL(req.url);
    const requestedHard = searchParams.get('hard') === 'true';
    const hardDelete = requestedHard && (role === 'admin' || role === 'master_admin');

    // ── Fetch document ────────────────────────────────────────────────
    const { data: doc, error: docError } = await supabaseAdmin
      .from('client_documents')
      .select('id, client_id, storage_path, is_deleted, file_name')
      .eq('id', id)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    if (doc.is_deleted && !hardDelete) {
      return NextResponse.json({ error: 'Document is already deleted.' }, { status: 410 });
    }

    if (hardDelete) {
      // ── Hard delete: remove from storage first, then DB ──────────────
      const { error: storageError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .remove([doc.storage_path]);

      if (storageError) {
        console.error('[Documents/Delete] Storage removal failed:', storageError);
        return NextResponse.json(
          { error: 'Storage deletion failed. Metadata retained for retry.' },
          { status: 500 }
        );
      }

      const { error: dbError } = await supabaseAdmin
        .from('client_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) {
        console.error('[Documents/Delete] DB hard delete failed:', dbError);
        return NextResponse.json({ error: 'Failed to remove document record.' }, { status: 500 });
      }

      // Audit
      void (async () => {
        try {
          await supabaseAdmin.from('document_audit_log').insert({
            document_id: doc.id,
            client_id:   doc.client_id,
            user_id:     user.id,
            action:      'delete',
            metadata:    { hard_delete: true, file_name: doc.file_name },
          });
        } catch (e) { console.error('[Audit] delete log failed:', e); }
      })();

      return NextResponse.json({ message: 'Document permanently deleted.' });

    } else {
      // ── Soft delete: mark as deleted, retain storage + metadata ──────
      const { error: updateError } = await supabaseAdmin
        .from('client_documents')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
        })
        .eq('id', doc.id);

      if (updateError) {
        console.error('[Documents/Delete] Soft delete failed:', updateError);
        return NextResponse.json({ error: 'Failed to delete document.' }, { status: 500 });
      }

      // Audit
      void (async () => {
        try {
          await supabaseAdmin.from('document_audit_log').insert({
            document_id: doc.id,
            client_id:   doc.client_id,
            user_id:     user.id,
            action:      'delete',
            metadata:    { hard_delete: false, file_name: doc.file_name },
          });
        } catch (e) { console.error('[Audit] delete log failed:', e); }
      })();

      return NextResponse.json({ message: 'Document deleted.' });
    }

  } catch (err) {
    console.error('[Documents/Delete] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
