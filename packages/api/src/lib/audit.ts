import { db } from '../db'

/**
 * Write an immutable audit record. Non-fatal: a logging failure must never
 * interrupt the operation being audited — hence the silent catch.
 */
export async function logAudit(
  userId: number | string,
  action: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.query(
      'INSERT INTO audit_log (user_id, action, metadata) VALUES ($1, $2, $3)',
      [userId, action, JSON.stringify(metadata)],
    )
  } catch { /* intentionally silent */ }
}
