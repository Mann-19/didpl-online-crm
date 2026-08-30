-- =============================================================
-- v311: Add reference_id to client_documents
-- Stores user-defined identifiers like Dastavej number,
-- Index II number, or any document reference for legal tracking.
-- =============================================================

ALTER TABLE public.client_documents
  ADD COLUMN IF NOT EXISTS reference_id TEXT;

COMMENT ON COLUMN public.client_documents.reference_id
  IS 'User-supplied identifier (e.g. Dastavej number, Index II number) for legal document tracking';

CREATE INDEX IF NOT EXISTS idx_client_documents_reference_id
  ON public.client_documents (reference_id)
  WHERE reference_id IS NOT NULL;
