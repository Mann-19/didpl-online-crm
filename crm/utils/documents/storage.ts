// utils/documents/storage.ts
// Storage path construction and Supabase Storage helpers

export const BUCKET_NAME = 'crm-documents';
export const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

/**
 * Build the canonical storage path for a document.
 * Format: clients/{clientId}/{docId}.{extension}
 *
 * Why this structure:
 *  - Scoped per client: easy to list / purge all files for a client
 *  - UUID filename: zero collision risk, original name preserved in DB
 *  - Extension from MIME: ensures correct browser handling on download
 */
export function buildStoragePath(clientId: string, docId: string, extension: string): string {
  const safeExt = extension.replace(/^\./, '').toLowerCase();
  return `clients/${clientId}/${docId}.${safeExt}`;
}
