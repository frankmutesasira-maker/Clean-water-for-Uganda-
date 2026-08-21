import { pool } from '../lib/db.js';
import { requireAdmin } from '../lib/admin-auth.js';
import { makeReceiptNumber } from '../lib/reference.js';

export default async function handler(req, res) {
  const session = requireAdmin(req, res, ['admin', 'superadmin', 'finance']);
  if (!session) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { donationId } = req.body || {};
  if (!donationId) return res.status(400).json({ error: 'donationId is required.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const donation = await client.query(`
      SELECT d.id,d.donation_reference,d.amount,d.currency,d.payment_method,d.designation,
             d.verified_at, donor.first_name, donor.last_name, donor.email
      FROM donations d JOIN donors donor ON donor.id=d.donor_id
      WHERE d.id=$1 AND d.status='verified' FOR UPDATE`, [donationId]);
    if (!donation.rows[0]) throw new Error('Verified donation not found.');

    const existing = await client.query('SELECT receipt_number FROM receipts WHERE donation_id=$1', [donationId]);
    if (existing.rows[0]) {
      await client.query('COMMIT');
      return res.status(200).json({ receiptNumber: existing.rows[0].receipt_number, existing: true });
    }

    const receiptNumber = makeReceiptNumber();
    await client.query(`INSERT INTO receipts (donation_id, receipt_number, issued_at) VALUES ($1,$2,NOW())`, [donationId, receiptNumber]);
    await client.query(`INSERT INTO donation_events (donation_id,event_type,payload) VALUES ($1,'receipt_issued',$2)`, [donationId, JSON.stringify({ receiptNumber, adminId: session.sub })]);
    await client.query(`INSERT INTO admin_audit_logs (admin_user_id,action,entity_type,entity_id,metadata) VALUES ($1,'issue_receipt','donation',$2,$3)`, [session.sub, donationId, JSON.stringify({ receiptNumber })]);
    await client.query('COMMIT');

    return res.status(201).json({ receiptNumber, donation: donation.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(400).json({ error: error.message || 'Unable to issue receipt.' });
  } finally { client.release(); }
}
