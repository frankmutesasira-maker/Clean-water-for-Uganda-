import { pool } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [totals, methods, pending, projects] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count, COALESCE(SUM(amount),0) AS total FROM donations WHERE status='verified'`),
      pool.query(`SELECT payment_method, currency, COUNT(*)::int AS count, COALESCE(SUM(amount),0) AS total FROM donations WHERE status='verified' GROUP BY payment_method,currency ORDER BY total DESC`),
      pool.query(`SELECT COUNT(*)::int AS count FROM donations WHERE status='pending'`),
      pool.query(`SELECT COUNT(*)::int AS count FROM projects WHERE published=true`)
    ]);

    return res.status(200).json({
      verifiedDonations: totals.rows[0].count,
      verifiedTotal: Number(totals.rows[0].total),
      pendingDonations: pending.rows[0].count,
      publishedProjects: projects.rows[0].count,
      byPaymentMethod: methods.rows.map(row => ({
        paymentMethod: row.payment_method,
        currency: row.currency,
        count: row.count,
        total: Number(row.total)
      }))
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to load dashboard data.' });
  }
}
