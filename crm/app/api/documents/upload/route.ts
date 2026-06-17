// app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { v4 as uuidv4 } from 'uuid';
import {
  validateFile,
  sanitizeFileName,
  getExtensionFromMime,
} from '@/utils/documents/validation';
import { buildStoragePath, BUCKET_NAME } from '@/utils/documents/storage';

const VALID_DOC_TYPES = [
  'kyc', 'aadhaar_pan', 'property',
  'sale_agreement', 'rent_agreement', 'image', 'miscellaneous',
];

export async function POST(req: NextRequest) {
  try {
    // ── Authenticate via cookie session ──────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Parse multipart form data ────────────────────────────────────
    const formData    = await req.formData();
    const file        = formData.get('file')          as File | null;
    const clientId    = formData.get('client_id')     as string | null;
    const bookingId   = formData.get('booking_id')    as string | null;
    const docType     = formData.get('document_type') as string | null;
    const description = formData.get('description')   as string | null;

    if (!file || !clientId || !bookingId || !docType) {
      return NextResponse.json(
        { error: 'Missing required fields: file, client_id, booking_id, document_type.' },
        { status: 400 }
      );
    }

    // ── Validate document_type ───────────────────────────────────────
    if (!VALID_DOC_TYPES.includes(docType)) {
      return NextResponse.json({ error: 'Invalid document_type.' }, { status: 400 });
    }

    // ── Validate file (size + MIME) ──────────────────────────────────
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 422 });
    }

    // ── Verify client exists (service role bypasses RLS for read) ─────
    const { data: clientRow, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .single();

    if (clientError || !clientRow) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    // ── Build storage path ───────────────────────────────────────────
    const docId       = uuidv4();
    const extension   = getExtensionFromMime(file.type);
    const storagePath = buildStoragePath(clientId, docId, extension);
    const safeName    = sanitizeFileName(file.name);

    // ── Upload to Supabase Storage ───────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const { error: storageError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      console.error('[Documents/Upload] Storage error:', storageError);
      return NextResponse.json({ error: 'File upload failed. Please try again.' }, { status: 500 });
    }

    // ── Save metadata to database ────────────────────────────────────
    const { data: doc, error: dbError } = await supabaseAdmin
      .from('client_documents')
      .insert({
        id:            docId,
        client_id:     clientId,
        booking_id:    bookingId,
        file_name:     safeName,
        storage_path:  storagePath,
        file_size:     file.size,
        mime_type:     file.type,
        document_type: docType,
        description:   description?.trim() || null,
        uploaded_by:   user.id,
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: remove the storage object so we don't have orphaned files
      console.error('[Documents/Upload] DB error — rolling back storage:', dbError);
      await supabaseAdmin.storage.from(BUCKET_NAME).remove([storagePath]);
      return NextResponse.json({ error: 'Failed to save document metadata.' }, { status: 500 });
    }

    // ── Audit log (non-blocking) ─────────────────────────────────────
    void (async () => {
      try {
        await supabaseAdmin.from('document_audit_log').insert({
          document_id:  docId,
          client_id:    clientId,
          user_id:      user.id,
          action:       'upload',
          metadata:     { file_name: safeName, file_size: file.size, mime_type: file.type },
        });
      } catch (e) { console.error('[Audit] upload log failed:', e); }
    })();

    return NextResponse.json({ document: doc }, { status: 201 });

  } catch (err) {
    console.error('[Documents/Upload] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
