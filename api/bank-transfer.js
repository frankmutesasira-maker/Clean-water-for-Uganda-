import { pool } from './lib/db.js';
import { cleanString } from './lib/reference.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const reference = cleanString(body.reference, 40);
    const transferReference = cleanString(body.transfer_reference, 200);
    const transferDate = cleanString(body.transfer_date, 20) || null;
    const amount = Number(body.amount);
    const currency = cleanString(body.currency || 'USD', 3).toUpperCase();

    if (!reference || !transferReference || !Number.isFinite(amount) || amount <= 0 || !/^[A-Z]{3}$/.test(currency)) {
      return res.status(400).json({ error: 'Reference, transfer reference, amount and currency are required.' });
    }

    const result = await pool.query(
      `SELECT id, amount, currency, payment_method, status
       FROM donations
       WHERE donation_reference=$1 LIMIT 1`,
      [reference]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Donation reference not found.' });
    const donation = result.rows[0];

    if (donation.payment_method !== 'bank-transfer') {
      return res.status(400).json({ error: 'This donation was not created as a bank transfer.' });
    }
    if (donation.status !== 'pending') {
      return res.status(409).json({ error: 'This donation is no longer pending.' });
    }
    if (Number(donation.amount) !== Number(amount) || donation.currency !== currency) {
      return res.status(400).json({ error: 'Amount or currency does not match the donation.' });
    }

    await pool.query(
      `INSERT INTO bank_transfer_submissions
       (donation_id, transfer_reference, transfer_date, amount, currency)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (donation_id) DO UPDATE SET
         transfer_reference=EXCLUDED.transfer_reference,
         transfer_date=EXCLUDED.transfer_date,
         amount=EXCLUDED.amount,
         currency=EXCLUDED.currency`,
      [donation.id, transferReference, transferDate, amount.toFixed(2), currency]
    );

    return res.status(201).json({ success: true, reference, status: 'pending' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to submit bank transfer.' });
  }
}
