import {query} from './lib/db.js';
export default async function handler(req,res){
 if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
 const b=req.body||{};
 for(const k of ['first_name','last_name','email','country','amount','frequency','project','payment_method']) if(!b[k]) return res.status(400).json({error:`Missing ${k}`});
 const amount=Number(b.amount); if(!Number.isFinite(amount)||amount<=0) return res.status(400).json({error:'Invalid amount'});
 if(!['one-time','monthly'].includes(b.frequency)) return res.status(400).json({error:'Invalid frequency'});
 if(!['bank_transfer','worldremit','online'].includes(b.payment_method)) return res.status(400).json({error:'Invalid payment method'});
 try{
  const donor=await query(`insert into donors(first_name,last_name,email,phone,country) values($1,$2,$3,$4,$5) returning id`,[b.first_name.trim(),b.last_name.trim(),b.email.trim().toLowerCase(),b.phone?.trim()||null,b.country.trim()]);
  const project=await query(`select id from projects where slug=$1 limit 1`,[b.project]);
  if(!project.rows[0]) return res.status(400).json({error:'Project not found'});
  const reference=`CWU-${new Date().getFullYear()}-${crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase()}`;
  await query(`insert into donations(reference,donor_id,project_id,amount_usd,frequency,payment_method,status,public_display) values($1,$2,$3,$4,$5,$6,'PENDING',$7)`,[reference,donor.rows[0].id,project.rows[0].id,amount,b.frequency,b.payment_method,Boolean(b.public_display)]);
  return res.status(201).json({reference,status:'PENDING',message:`Donation created. Your reference is ${reference}.`});
 }catch(e){console.error(e);return res.status(500).json({error:'Unable to create donation at this time.'});}
}