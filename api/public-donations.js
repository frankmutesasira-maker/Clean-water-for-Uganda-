import { pool } from './lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = Math.min(Math.max(Number(req.query?.limit || 50), 1), 100);
    const project = req.query?.project || null;

    const result = await pool.query(
      `SELECT
         d.donation_reference,
         d.amount,
         d.currency,
         d.payment_method,
         d.created_at,
         p.name AS project_name,
         p.slug AS project_slug,
         CASE
           WHEN EXISTS (
             SELECT 1 FROM donors x
             WHERE x.id = d.donor_id
           ) THEN 'Anonymous donor'
           ELSE 'Anonymous donor'
         END AS donor_display
       FROM donations d
       LEFT JOIN projects p ON p.id = d.project_id
       WHERE d.status = 'verified'
         AND ($1::text IS NULL OR p.slug = $1)
       ORDER BY d.created_at DESC
       LIMIT $2`,
      [project, limit]
    );

    return res.status(200).json({
      donations: result.rows.map((row) => ({
        reference: row.donation_reference,
        amount: Number(row.amount),
        currency: row.currency,
        paymentMethod: row.payment_method,
        project: row.project_name,
        projectSlug: row.project_slug,
        donorDisplay: 'Anonymous donor',
        receivedAt: row.created_at
      }))
    });
  } catch (error) {
    console.error('public donations error', error);
    return res.status(500).json({ error: 'Unable to load donations' });
  }
}
