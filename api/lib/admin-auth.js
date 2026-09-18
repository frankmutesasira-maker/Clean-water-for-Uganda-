export function requireAdmin(req,res){
  const expected=process.env.ADMIN_API_KEY;
  const provided=req.headers['x-admin-key'];
  if(!expected) { res.status(503).json({error:'Admin verification is not configured.'}); return false; }
  if(typeof provided!=='string'||provided.length<24||provided!==expected){ res.status(401).json({error:'Unauthorized.'}); return false; }
  return true;
}