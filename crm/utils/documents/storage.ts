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

/**
 * Ensure that the Supabase Storage bucket exists.
 * If missing (e.g. fresh production environment), creates it automatically.
 */
export async function ensureStorageBucket(supabaseAdminClient: any): Promise<boolean> {
  try {
    const { data: bucket, error } = await supabaseAdminClient.storage.getBucket(BUCKET_NAME);
    if (error || !bucket) {
      console.log(`[Storage] Bucket '${BUCKET_NAME}' not found or inaccessible. Attempting auto-creation...`);
      const { error: createErr } = await supabaseAdminClient.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 52428800, // 50 MB
      });
      if (createErr) {
        console.error(`[Storage] Failed to create bucket '${BUCKET_NAME}':`, createErr);
        return false;
      }
      console.log(`[Storage] Bucket '${BUCKET_NAME}' successfully created.`);
    }
    return true;
  } catch (err) {
    console.error(`[Storage] Exception in ensureStorageBucket:`, err);
    return false;
  }
}

