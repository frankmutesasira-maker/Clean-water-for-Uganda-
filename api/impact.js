import { pool } from './lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const totals = await pool.query(`
      SELECT COUNT(*)::int AS donation_count,
             COALESCE(SUM(amount),0)::numeric AS total_raised
      FROM donations WHERE status='verified' AND currency='USD'`);
    const projects = await pool.query(`
      SELECT COUNT(*)::int AS project_count
      FROM projects WHERE published=TRUE`);
    return res.status(200).json({
      totalRaised: Number(totals.rows[0].total_raised),
      donationCount: totals.rows[0].donation_count,
      projectCount: projects.rows[0].project_count
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to load impact data.' });
  }
}
