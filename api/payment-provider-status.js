import { getPaymentProvider } from './lib/payment-provider.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const provider = getPaymentProvider();
  return res.status(200).json({ configured: provider.configured, provider: process.env.PAYMENT_PROVIDER || null });
}
