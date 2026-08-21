import { pool } from './lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const reference = String(req.query.reference || '').trim();
  if (!reference) return res.status(400).json({ error: 'Donation reference is required.' });

  try {
    const result = await pool.query(`
      SELECT d.donation_reference, d.amount, d.currency, d.frequency,
             d.designation, d.payment_method, d.status, d.verified_at,
             p.name AS project_name
      FROM donations d
      LEFT JOIN projects p ON p.id=d.project_id
      WHERE d.donation_reference=$1 LIMIT 1`, [reference]);

    if (!result.rows.length) return res.status(404).json({ error: 'Donation not found.' });
    const d = result.rows[0];
    return res.status(200).json({
      reference: d.donation_reference,
      amount: Number(d.amount),
      currency: d.currency,
      frequency: d.frequency,
      designation: d.designation,
      paymentMethod: d.payment_method,
      status: d.status,
      verifiedAt: d.verified_at,
      project: d.project_name || 'Where needed most'
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to retrieve donation status.' });
  }
}
