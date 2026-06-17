-- =============================================================
-- v210: Client Document Storage
-- Creates client_documents and document_audit_log tables
-- with RLS, indexes, and triggers
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. client_documents — metadata for uploaded files
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_documents (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  client_id      UUID         NOT NULL
    REFERENCES public.clients(id)
    ON DELETE CASCADE,

  -- File metadata
  file_name      TEXT         NOT NULL,
  storage_path   TEXT         NOT NULL UNIQUE,
  file_size      BIGINT       NOT NULL CHECK (file_size > 0),
  mime_type      TEXT         NOT NULL,

  -- Categorisation
  document_type  TEXT         NOT NULL
    CHECK (document_type IN (
      'kyc',
      'aadhaar_pan',
      'property',
      'miscellaneous'
    )),
  description    TEXT,

  -- Audit
  uploaded_by    UUID         NOT NULL
    REFERENCES auth.users(id)
    ON DELETE SET NULL,

  -- Soft delete
  is_deleted     BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at     TIMESTAMPTZ,
  deleted_by     UUID
    REFERENCES auth.users(id)
    ON DELETE SET NULL,

  -- Timestamps
  uploaded_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_client_documents_updated_at ON public.client_documents;
CREATE TRIGGER trg_client_documents_updated_at
  BEFORE UPDATE ON public.client_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id
  ON public.client_documents (client_id);

CREATE INDEX IF NOT EXISTS idx_client_documents_type
  ON public.client_documents (client_id, document_type);

CREATE INDEX IF NOT EXISTS idx_client_documents_active
  ON public.client_documents (client_id, is_deleted)
  WHERE is_deleted = FALSE;

-- Comments
COMMENT ON TABLE  public.client_documents              IS 'Document metadata for CRM client files stored in Supabase Storage';
COMMENT ON COLUMN public.client_documents.storage_path IS 'Full path in crm-documents bucket: clients/{client_id}/{uuid}.{ext}';
COMMENT ON COLUMN public.client_documents.is_deleted   IS 'Soft delete; true = hidden from UI, file retained in storage';

-- ─────────────────────────────────────────────────────────────
-- 2. RLS on client_documents
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users can read non-deleted documents
-- (Server-side API routes use service role, so RLS is effectively
--  enforced at the API level. This policy covers direct DB access.)
CREATE POLICY "Authenticated users can read client_documents"
  ON public.client_documents
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND is_deleted = FALSE
  );

-- INSERT: authenticated users can insert their own uploads
CREATE POLICY "Authenticated users can insert client_documents"
  ON public.client_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
  );

-- UPDATE: authenticated users can soft-delete / update metadata
CREATE POLICY "Authenticated users can update client_documents"
  ON public.client_documents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- DELETE: only service role (used by admin hard-delete API route)
-- Regular users use soft delete via UPDATE
CREATE POLICY "Service role can hard delete client_documents"
  ON public.client_documents
  FOR DELETE
  TO service_role
  USING (TRUE);

-- ─────────────────────────────────────────────────────────────
-- 3. document_audit_log — immutable activity log
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.document_audit_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID        NOT NULL,
  client_id     UUID        NOT NULL,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action        TEXT        NOT NULL
    CHECK (action IN ('upload', 'download', 'delete', 'update')),
  metadata      JSONB,
  performed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_document_id   ON public.document_audit_log (document_id);
CREATE INDEX IF NOT EXISTS idx_audit_client_id     ON public.document_audit_log (client_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_at  ON public.document_audit_log (performed_at DESC);

-- RLS: audit log is write-only for authenticated users; only service role reads
ALTER TABLE public.document_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on audit log"
  ON public.document_audit_log
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can insert audit log"
  ON public.document_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
