import crypto from 'node:crypto';

export function requireAdmin(req, res, roles = ['admin', 'superadmin', 'finance']) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    res.status(503).json({ error: 'Admin authentication is not configured.' });
    return null;
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return null;
  }

  try {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) throw new Error('Invalid token');
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('Invalid signature');

    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!session.sub || !session.role || !session.exp || session.exp < Math.floor(Date.now() / 1000)) throw new Error('Expired session');
    if (!roles.includes(session.role)) throw new Error('Insufficient role');
    return session;
  } catch {
    res.status(401).json({ error: 'Invalid or expired admin session.' });
    return null;
  }
}

export function createAdminToken({ id, role }) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured');
  const payload = Buffer.from(JSON.stringify({
    sub: id,
    role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
