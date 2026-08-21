import { pool } from './lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const limit = Math.min(Math.max(Number(req.query?.limit || 50), 1), 100);
    const project = req.query?.project || null;

    const result = await pool.query(
      `SELECT d.donation_reference, d.amount, d.currency, d.created_at,
              d.public_display, dn.first_name, dn.country,
              p.name AS project_name, p.slug AS project_slug
       FROM donations d
       JOIN donors dn ON dn.id = d.donor_id
       LEFT JOIN projects p ON p.id = d.project_id
       WHERE d.status = 'verified'
         AND d.public_display = TRUE
         AND ($1::text IS NULL OR p.slug = $1)
       ORDER BY d.created_at DESC
       LIMIT $2`,
      [project, limit]
    );

    return res.status(200).json({
      donations: result.rows.map((row) => ({
        amount: Number(row.amount),
        currency: row.currency,
        donorName: row.first_name || 'Anonymous',
        country: row.country || 'Country not provided',
        project: row.project_name,
        projectSlug: row.project_slug,
        receivedAt: row.created_at
      }))
    });
  } catch (error) {
    console.error('public donations error', error);
    return res.status(500).json({ error: 'Unable to load donations' });
  }
}
