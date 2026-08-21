import { pool } from './lib/db.js';
import { cleanString } from './lib/reference.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const slug = cleanString(req.query?.slug, 220) || '100-metre-community-borehole';
    const result = await pool.query(
      `SELECT p.id, p.name, p.slug, p.description, p.location,
              p.target_amount, p.currency, p.status,
              COALESCE(SUM(CASE WHEN d.status='verified' THEN d.amount ELSE 0 END), 0) AS verified_amount,
              COUNT(CASE WHEN d.status='verified' THEN 1 END)::int AS verified_donation_count
       FROM projects p
       LEFT JOIN donations d ON d.project_id = p.id
       WHERE p.slug=$1 AND p.published=true
       GROUP BY p.id
       LIMIT 1`,
      [slug]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Project not found.' });

    const project = result.rows[0];
    const target = Number(project.target_amount);
    const raised = Number(project.verified_amount);
    const remaining = Math.max(target - raised, 0);
    const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;

    return res.status(200).json({
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        location: project.location,
        target: target.toFixed(2),
        currency: project.currency,
        status: project.status
      },
      verified: {
        amount: raised.toFixed(2),
        donation_count: project.verified_donation_count
      },
      remaining: remaining.toFixed(2),
      progress_percent: Number(progress.toFixed(1))
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to load project progress.' });
  }
}
