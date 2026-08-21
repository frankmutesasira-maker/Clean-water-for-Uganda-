import { pool } from '../lib/db.js';
import { requireAdmin } from '../lib/admin-auth.js';

export default async function handler(req, res) {
  const session = requireAdmin(req, res, ['admin', 'superadmin', 'finance']);
  if (!session) return;

  try {
    const result = await pool.query(`
      SELECT b.id, b.donation_id, b.transfer_reference, b.transfer_date, b.amount,
             b.currency, b.status, b.reviewed_at, d.donation_reference,
             donor.first_name, donor.last_name, donor.email
      FROM bank_transfer_submissions b
      JOIN donations d ON d.id=b.donation_id
      JOIN donors donor ON donor.id=d.donor_id
      WHERE b.status='pending'
      ORDER BY b.created_at ASC
    `);
    return res.status(200).json({ submissions: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to load bank transfers.' });
  }
}
