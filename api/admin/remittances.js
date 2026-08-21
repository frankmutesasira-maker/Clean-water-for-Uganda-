import { pool } from '../lib/db.js';
import { requireAdmin } from '../lib/admin-auth.js';

export default async function handler(req, res) {
  const session = requireAdmin(req, res, ['admin', 'superadmin', 'finance']);
  if (!session) return;

  try {
    const result = await pool.query(`
      SELECT r.id, r.donation_id, r.provider, r.transfer_reference,
             r.transfer_date, r.amount, r.currency, r.status, r.reviewed_at,
             d.donation_reference, donor.first_name, donor.last_name, donor.email
      FROM remittance_submissions r
      JOIN donations d ON d.id=r.donation_id
      JOIN donors donor ON donor.id=d.donor_id
      WHERE r.status='pending'
      ORDER BY r.created_at ASC
    `);
    return res.status(200).json({ submissions: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to load remittances.' });
  }
}
