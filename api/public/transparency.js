import { pool } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const [donations, projects] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count, COALESCE(SUM(amount),0) AS total FROM donations WHERE status='verified'`),
      pool.query(`SELECT COUNT(*)::int AS count FROM projects WHERE published=true`)
    ]);
    return res.status(200).json({
      verifiedDonationCount: donations.rows[0].count,
      verifiedDonationTotal: Number(donations.rows[0].total),
      publishedProjectCount: projects.rows[0].count,
      methodology: 'Totals include only donations whose status is verified in the donation ledger.'
    });
  } catch (error) { console.error(error); return res.status(500).json({ error:'Unable to load transparency data.' }); }
}
