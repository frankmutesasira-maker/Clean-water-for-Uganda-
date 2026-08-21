import { pool } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const result = await pool.query(`
      SELECT p.id,p.name,p.slug,p.location,p.target_amount,p.currency,p.status,p.short_description,
             COALESCE(SUM(CASE WHEN d.status='verified' THEN d.amount ELSE 0 END),0) AS amount_raised
      FROM projects p
      LEFT JOIN donations d ON d.project_id=p.id
      WHERE p.published=true
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    return res.status(200).json({ projects: result.rows.map(p => {
      const target = Number(p.target_amount); const raised = Number(p.amount_raised);
      return { id:p.id, name:p.name, slug:p.slug, location:p.location, status:p.status, description:p.short_description, currency:p.currency, targetAmount:target, amountRaised:raised, remaining:Math.max(0,target-raised), progressPercent:target>0?Math.min(100,raised/target*100):0 };
    }) });
  } catch (error) { console.error(error); return res.status(500).json({ error:'Unable to load project progress.' }); }
}
