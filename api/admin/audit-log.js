import { pool } from '../lib/db.js';
import { requireAdmin } from '../lib/admin-auth.js';

export default async function handler(req, res) {
  const session = requireAdmin(req, res, ['admin', 'superadmin']);
  if (!session) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const result = await pool.query(`
      SELECT a.id,a.action,a.entity_type,a.entity_id,a.metadata,a.created_at,
             u.email,u.role
      FROM admin_audit_logs a
      JOIN admin_users u ON u.id=a.admin_user_id
      ORDER BY a.created_at DESC
      LIMIT 500
    `);
    return res.status(200).json({ logs: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to load audit log.' });
  }
}
