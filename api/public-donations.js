import {query} from './lib/db.js';
export default async function handler(req,res){
 if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
 try{
  const totals=await query(`select coalesce(sum(amount_usd),0) total,count(distinct donor_id) donors from donations where status='VERIFIED' and public_display=true`);
  const rows=await query(`select d.amount_usd amount,dr.first_name,dr.country from donations d join donors dr on dr.id=d.donor_id where d.status='VERIFIED' and d.public_display=true order by d.verified_at desc nulls last,d.created_at desc limit 100`);
  const projects=await query(`select count(*)::int projects from projects where status<>'Archived'`);
  return res.status(200).json({total:Number(totals.rows[0].total),donors:Number(totals.rows[0].donors),projects:Number(projects.rows[0].projects),donations:rows.rows});
 }catch(e){console.error(e);return res.status(500).json({error:'Public donation data temporarily unavailable.'});}
}