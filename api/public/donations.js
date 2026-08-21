import { pool } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query?.limit ?? '25', 10) || 25, 1), 100);
    const requestedSlug = typeof req.query?.project === 'string' ? req.query.project.trim() : '';
    const projectSlug = requestedSlug === 'community-borehole-project' || requestedSlug === '100-metre-community-borehole'
      ? '100-metre-borehole'
      : requestedSlug;

    const params = [limit];
    let projectFilter = '';
    if (projectSlug) { params.unshift(projectSlug); projectFilter = 'AND p.slug = $1'; }
    const limitPlaceholder = projectSlug ? '$2' : '$1';

    const result = await pool.query(
      `SELECT d.amount, d.currency, d.created_at,
              p.name AS project_name, p.slug AS project_slug,
              dr.first_name, dr.country
       FROM donations d
       JOIN donors dr ON dr.id = d.donor_id
       LEFT JOIN projects p ON p.id = d.project_id
       WHERE d.status = 'verified'
         AND COALESCE(d.public_display, TRUE) = TRUE
         ${projectFilter}
       ORDER BY d.verified_at DESC NULLS LAST, d.created_at DESC
       LIMIT ${limitPlaceholder}`,
      params
    );

    const donations = result.rows.map((row) => ({
      donor: row.first_name || 'Anonymous',
      country: row.country || 'Country not displayed',
      amount: Number(row.amount),
      currency: row.currency,
      project: row.project_name || 'Clean Water for Uganda',
      projectSlug: row.project_slug || null,
      receivedAt: row.created_at
    }));

    res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
    return res.status(200).json({ donations });
  } catch (error) {
    console.error('Public donation feed error:', error);
    return res.status(500).json({ error: 'Unable to load donation feed' });
  }
}
