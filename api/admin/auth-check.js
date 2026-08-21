import { requireAdmin } from '../lib/admin-auth.js';

export default async function handler(req, res) {
  const session = requireAdmin(req, res);
  if (!session) return;
  return res.status(200).json({ authenticated: true, adminId: session.sub, role: session.role });
}
