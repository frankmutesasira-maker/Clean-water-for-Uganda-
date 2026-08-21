import { pool } from '../lib/db.js';
import { requireAdmin } from '../lib/admin-auth.js';

export default async function handler(req, res) {
  const session = requireAdmin(req, res, ['admin', 'superadmin', 'finance']);
  if (!session) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const result = await pool.query(`
      SELECT donor.id, donor.first_name, donor.last_name, donor.email, donor.country,
             COUNT(d.id)::int AS donation_count,
             COALESCE(SUM(CASE WHEN d.status='verified' THEN d.amount ELSE 0 END),0) AS verified_total,
             MAX(d.created_at) AS last_donation
      FROM donors donor
      LEFT JOIN donations d ON d.donor_id=donor.id
      GROUP BY donor.id
      ORDER BY verified_total DESC, donor.created_at DESC
      LIMIT 1000
    `);
    return res.status(200).json({ donors: result.rows.map(d => ({
      ...d, verifiedTotal: Number(d.verified_total)
    })) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to load donor report.' });
  }
}
