import { pool } from '../lib/db.js';
import { requireAdmin } from '../lib/admin-auth.js';

export default async function handler(req, res) {
  const session = requireAdmin(req, res, ['admin', 'superadmin', 'finance']);
  if (!session) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { submissionId, type, action, notes } = req.body || {};
  if (!submissionId || !['bank','remittance'].includes(type) || !['verify','reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid review request.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const table = type === 'bank' ? 'bank_transfer_submissions' : 'remittance_submissions';
    const submission = await client.query(
      `SELECT id, donation_id, amount, currency, status FROM ${table} WHERE id=$1 FOR UPDATE`,
      [submissionId]
    );
    if (!submission.rows[0]) throw new Error('Submission not found');
    if (submission.rows[0].status !== 'pending') throw new Error('Submission already reviewed');

    const next = action === 'verify' ? 'verified' : 'rejected';
    await client.query(
      `UPDATE ${table} SET status=$1, reviewed_by=$2, reviewed_at=NOW(), review_notes=$3 WHERE id=$4`,
      [next, session.sub, notes || null, submissionId]
    );

    const donationId = submission.rows[0].donation_id;
    if (action === 'verify') {
      await client.query(
        `UPDATE donations SET status='verified', verified_at=NOW() WHERE id=$1 AND status='pending'`,
        [donationId]
      );
      await client.query(
        `INSERT INTO financial_ledger (donation_id, entry_type, amount, currency, description)
         VALUES ($1,'donation',$2,$3,$4)
         ON CONFLICT (donation_id, entry_type) DO NOTHING`,
        [donationId, submission.rows[0].amount, submission.rows[0].currency, `${type} transfer verified`]
      );
    } else {
      await client.query(
        `UPDATE donations SET status='failed' WHERE id=$1 AND status='pending'`,
        [donationId]
      );
    }

    await client.query(
      `INSERT INTO donation_events (donation_id, event_type, event_data)
       VALUES ($1,$2,$3)`,
      [donationId, `${type}_review_${action}`, JSON.stringify({ adminId: session.sub, notes: notes || null })]
    );

    await client.query('COMMIT');
    return res.status(200).json({ success: true, status: next });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(400).json({ error: error.message || 'Unable to review transfer.' });
  } finally {
    client.release();
  }
}
