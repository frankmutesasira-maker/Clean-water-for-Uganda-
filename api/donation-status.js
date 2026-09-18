import {query} from './lib/db.js';

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  const ref=String(req.query.reference||'').trim();
  if(!/^CWU-\d{4}-[A-Z0-9]{8}$/.test(ref)) return res.status(400).json({status:'INVALID',message:'Enter a valid donation reference.'});
  try{
    const result=await query('select reference,status,amount_usd,frequency,payment_method,created_at,verified_at from donations where reference=$1 limit 1',[ref]);
    if(!result.rows[0]) return res.status(404).json({status:'NOT_FOUND',message:'No donation record was found for this reference.'});
    const d=result.rows[0];
    return res.status(200).json({reference:d.reference,status:d.status,amount:Number(d.amount_usd),frequency:d.frequency,payment_method:d.payment_method,created_at:d.created_at,verified_at:d.verified_at||null});
  }catch(e){console.error(e);return res.status(500).json({status:'ERROR',message:'Donation status is temporarily unavailable.'});}
}