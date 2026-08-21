import { pool } from './lib/db.js';
import { makeReference, cleanString } from './lib/reference.js';

const allowedMethods = new Set(['online', 'bank-transfer', 'remittance']);
const allowedFrequency = new Set(['one-time', 'monthly']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const donor = body.donor || {};
    const amount = Number(body.amount);
    const currency = cleanString(body.currency || 'USD', 3).toUpperCase();
    const frequency = cleanString(body.frequency || 'one-time', 20);
    const designation = cleanString(body.designation || 'where-needed-most', 80);
    const paymentMethod = cleanString(body.payment_method, 30);
    const projectId = body.project_id || null;
    const publicDisplay = donor.anonymous !== true;

    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) return res.status(400).json({ error: 'Enter a valid donation amount.' });
    if (!/^[A-Z]{3}$/.test(currency)) return res.status(400).json({ error: 'Invalid currency.' });
    if (!allowedFrequency.has(frequency) || !allowedMethods.has(paymentMethod)) return res.status(400).json({ error: 'Invalid donation options.' });
    if (!/^\S+@\S+\.\S+$/.test(String(donor.email || ''))) return res.status(400).json({ error: 'A valid email is required.' });
    if (!donor.firstName || !donor.lastName) return res.status(400).json({ error: 'First and last name are required.' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const donorResult = await client.query(
        `INSERT INTO donors (first_name, last_name, email, country) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id`,
        [cleanString(donor.firstName,100), cleanString(donor.lastName,100), cleanString(donor.email,320).toLowerCase(), cleanString(donor.country,100) || null]
      );
      let donorId = donorResult.rows[0]?.id;
      if (!donorId) {
        const existing = await client.query(`SELECT id FROM donors WHERE LOWER(email)=LOWER($1) LIMIT 1`, [cleanString(donor.email,320)]);
        donorId = existing.rows[0]?.id;
      }
      if (!donorId) throw new Error('Unable to create donor record.');

      if (projectId) {
        const project = await client.query(`SELECT id FROM projects WHERE id=$1 AND published=TRUE LIMIT 1`, [projectId]);
        if (!project.rows.length) throw new Error('Selected project is not available.');
      }

      const reference = makeReference();
      const donation = await client.query(
        `INSERT INTO donations
         (donation_reference, donor_id, project_id, amount, currency, frequency, designation, payment_method, public_display)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id, donation_reference`,
        [reference, donorId, projectId, amount.toFixed(2), currency, frequency, designation, paymentMethod, publicDisplay]
      );
      const donationId = donation.rows[0].id;

      if (paymentMethod === 'bank-transfer') {
        await client.query('COMMIT');
        return res.status(201).json({ success:true, reference, donationId, next:'bank-transfer' });
      }
      if (paymentMethod === 'remittance') {
        await client.query('COMMIT');
        return res.status(201).json({ success:true, reference, donationId, next:'remittance' });
      }

      await client.query('ROLLBACK');
      return res.status(503).json({ error:'Online checkout is not configured yet. Bank transfer and remittance submission are available.' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Unable to create donation.' });
  }
}
