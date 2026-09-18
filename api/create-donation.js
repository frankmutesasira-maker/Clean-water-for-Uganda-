import {query} from './lib/db.js';

const METHODS=['western_union','moneygram','mtn_mobile_money'];
const FREQUENCIES=['one-time','monthly'];

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const b=req.body||{};
  for(const k of ['first_name','last_name','email','country','amount','frequency','project','payment_method']){
    if(typeof b[k]!=='string' || !b[k].trim()) return res.status(400).json({error:'Missing '+k});
  }
  const amount=Number(b.amount);
  if(!Number.isFinite(amount)||amount<=0||amount>1000000) return res.status(400).json({error:'Enter a valid donation amount.'});
  if(!FREQUENCIES.includes(b.frequency)) return res.status(400).json({error:'Invalid frequency.'});
  if(!METHODS.includes(b.payment_method)) return res.status(400).json({error:'Invalid payment method.'});
  const first=b.first_name.trim().slice(0,80), last=b.last_name.trim().slice(0,80);
  const email=b.email.trim().toLowerCase(), country=b.country.trim().slice(0,100);
  const phone=typeof b.phone==='string'?b.phone.trim().slice(0,40):null;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({error:'Enter a valid email address.'});
  if(b.project!=='100-metre-community-borehole') return res.status(400).json({error:'Project not found.'});
  try{
    const project=await query('select id from projects where slug=$1 limit 1',[b.project]);
    if(!project.rows[0]) return res.status(400).json({error:'Project not found.'});
    const donor=await query('insert into donors(first_name,last_name,email,phone,country) values($1,$2,$3,$4,$5) returning id',[first,last,email,phone,country]);
    const reference='CWU-'+new Date().getFullYear()+'-'+crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase();
    await query("insert into donations(reference,donor_id,project_id,amount_usd,frequency,payment_method,status,public_display) values($1,$2,$3,$4,$5,$6,'PENDING',$7)",[reference,donor.rows[0].id,project.rows[0].id,amount,b.frequency,b.payment_method,b.public_display===true]);
    return res.status(201).json({reference,status:'PENDING',message:'Donation reference '+reference+' created. Please complete your donation using the selected payment method and keep this reference for verification.'});
  }catch(e){console.error(e);return res.status(500).json({error:'Unable to create donation at this time.'});}
}