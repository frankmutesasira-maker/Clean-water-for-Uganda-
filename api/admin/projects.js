import { pool } from '../lib/db.js';
import { requireAdmin } from '../lib/admin-auth.js';

export default async function handler(req, res) {
  const session = requireAdmin(req, res, ['admin', 'superadmin', 'finance']);
  if (!session) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const result = await pool.query(`
      SELECT p.id,p.name,p.slug,p.location,p.target_amount,p.currency,p.status,p.published,
             COALESCE(SUM(CASE WHEN d.status='verified' THEN d.amount ELSE 0 END),0) AS amount_raised
      FROM projects p
      LEFT JOIN donations d ON d.project_id=p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    return res.status(200).json({ projects: result.rows.map(p => ({
      ...p,
      targetAmount: Number(p.target_amount),
      amountRaised: Number(p.amount_raised),
      remaining: Math.max(0, Number(p.target_amount)-Number(p.amount_raised)),
      progressPercent: Number(p.target_amount) > 0 ? Math.min(100, Number(p.amount_raised)/Number(p.target_amount)*100) : 0
    })) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to load project accounting.' });
  }
}
