import { getPaymentProvider } from './lib/payment-provider.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const provider = getPaymentProvider();
  if (!provider.configured) return res.status(503).json({ error: 'Online payment is not configured yet.' });
  try {
    const result = await provider.createCheckout(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(502).json({ error: 'Unable to create payment checkout.' });
  }
}
