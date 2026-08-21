import {query} from '../lib/db.js';
export default async function handler(req,res){
 if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
 const {reference,decision,actor='finance'}=req.body||{};
 if(!reference||!['VERIFY','REJECT'].includes(decision)) return res.status(400).json({error:'Reference and valid decision are required.'});
 try{
  const found=await query(`select id,amount_usd,status from donations where reference=$1 for update`,[reference]);
  if(!found.rows[0]) return res.status(404).json({error:'Donation not found'});
  const d=found.rows[0];
  if(d.status==='VERIFIED'||d.status==='REJECTED') return res.status(409).json({error:`Donation is already ${d.status}.`});
  if(decision==='REJECT'){
   await query(`update donations set status='REJECTED' where id=$1`,[d.id]);
   await query(`insert into audit_log(actor,action,entity_type,entity_id,metadata) values($1,'REJECT','donation',$2,$3)`,[actor,d.id,JSON.stringify({reference})]);
   return res.status(200).json({reference,status:'REJECTED'});
  }
  const receipt=`CWU-RECEIPT-${new Date().getFullYear()}-${crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase()}`;
  await query(`update donations set status='VERIFIED',verified_at=now() where id=$1`,[d.id]);
  await query(`insert into ledger(donation_id,entry_type,amount_usd) values($1,'DONATION_VERIFIED',$2)`,[d.id,d.amount_usd]);
  await query(`insert into receipts(donation_id,receipt_number) values($1,$2)`,[d.id,receipt]);
  await query(`insert into audit_log(actor,action,entity_type,entity_id,metadata) values($1,'VERIFY','donation',$2,$3)`,[actor,d.id,JSON.stringify({reference,receipt})]);
  return res.status(200).json({reference,status:'VERIFIED',receipt});
 }catch(e){console.error(e);return res.status(500).json({error:'Verification failed.'});}
}