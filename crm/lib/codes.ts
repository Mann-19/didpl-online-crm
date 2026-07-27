// ─────────────────────────────────────────────────────────────────────────────
// Entity Code Generation
//
// Generates human-readable codes for CRM entities.
// Format: PREFIX-AB-XXXX  (initials from name + 4 random alphanumeric chars)
// Example: CLI-MA-7X4K, CONS-RA-2P9Q, EMP-JD-5M3N
//
// Uses crypto.randomUUID() sliced to avoid the fragile random-retry collision
// loop that existed in the previous implementation.
// ─────────────────────────────────────────────────────────────────────────────

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Omits ambiguous chars: 0/O, 1/I

/**
 * Generates a random alphanumeric suffix of the given length.
 * Uses crypto.getRandomValues for better randomness than Math.random().
 */
function randomSuffix(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => ALPHABET[b % ALPHABET.length])
    .join('')
}

/**
 * Generates a human-readable entity code.
 *
 * @param prefix - Short uppercase prefix for the entity type (e.g. 'CLI', 'CONS', 'EMP')
 * @param name   - Entity name used to derive 2-character initials
 * @returns      - Code string, e.g. 'CLI-MA-7X4K'
 */
export function generateEntityCode(prefix: string, name: string): string {
  const initials = (name || 'XX')
    .trim()
    .substring(0, 2)
    .toUpperCase()
    .replace(/[^A-Z]/g, 'X') // replace non-alpha with X

  const suffix = randomSuffix(4)
  return `${prefix}-${initials}-${suffix}`
}

/**
 * Generates a unique entity code with collision checking.
 * Tries up to maxAttempts times before throwing.
 *
 * @param checkExists - Async function that returns true if the code already exists
 * @param prefix      - Entity prefix
 * @param name        - Entity name
 * @param maxAttempts - Max retries before throwing (default: 10)
 */
export async function generateUniqueCode(
  checkExists: (code: string) => Promise<boolean>,
  prefix: string,
  name: string,
  maxAttempts = 10
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateEntityCode(prefix, name)
    const exists = await checkExists(code)
    if (!exists) return code
  }
  throw new Error(
    `Could not generate unique ${prefix} code after ${maxAttempts} attempts. This is extremely unlikely — investigate immediately.`
  )
}
