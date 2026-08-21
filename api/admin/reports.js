import { pool } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const result = await pool.query(`
      SELECT
        d.donation_reference,
        d.created_at,
        donor.first_name,
        donor.last_name,
        donor.email,
        d.amount,
        d.currency,
        d.payment_method,
        d.designation,
        d.status,
        d.verified_at,
        r.receipt_number,
        p.name AS project_name
      FROM donations d
      JOIN donors donor ON donor.id=d.donor_id
      LEFT JOIN receipts r ON r.donation_id=d.id
      LEFT JOIN projects p ON p.id=d.project_id
      ORDER BY d.created_at DESC
      LIMIT 1000
    `);

    return res.status(200).json({ rows: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to load report.' });
  }
}
