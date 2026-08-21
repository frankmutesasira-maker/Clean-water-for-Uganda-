import { pool } from './lib/db.js';
import { cleanString } from './lib/reference.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const b = req.body || {};
    const reference = cleanString(b.reference, 40);
    const provider = cleanString(b.provider, 100);
    const transferReference = cleanString(b.transfer_reference, 200);
    const transferDate = cleanString(b.transfer_date, 20) || null;
    const amount = Number(b.amount);
    const currency = cleanString(b.currency || 'USD', 3).toUpperCase();
    if (!reference || !provider || !transferReference || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Reference, provider, transfer reference and amount are required.' });
    const donation = await pool.query(`SELECT id, amount, currency, payment_method, status FROM donations WHERE donation_reference=$1 LIMIT 1`, [reference]);
    if (!donation.rows.length) return res.status(404).json({ error: 'Donation reference not found.' });
    const d = donation.rows[0];
    if (d.payment_method !== 'remittance') return res.status(400).json({ error: 'This donation was not created as a remittance.' });
    if (d.status !== 'pending') return res.status(409).json({ error: 'This donation is no longer pending.' });
    if (Number(d.amount) !== amount || d.currency !== currency) return res.status(400).json({ error: 'Amount or currency does not match the donation.' });
    await pool.query(`INSERT INTO remittance_submissions (donation_id,provider,transfer_reference,transfer_date,amount,currency) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (donation_id) DO UPDATE SET provider=EXCLUDED.provider,transfer_reference=EXCLUDED.transfer_reference,transfer_date=EXCLUDED.transfer_date,amount=EXCLUDED.amount,currency=EXCLUDED.currency`, [d.id, provider, transferReference, transferDate, amount.toFixed(2), currency]);
    return res.status(201).json({ success: true, reference, status: 'pending' });
  } catch (error) { console.error(error); return res.status(500).json({ error: 'Unable to submit remittance.' }); }
}
