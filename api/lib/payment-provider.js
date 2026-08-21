export function getPaymentProvider() {
  const provider = process.env.PAYMENT_PROVIDER;
  if (!provider || provider === 'placeholder') {
    return {
      configured: false,
      async createCheckout() { throw new Error('Payment provider is not configured.'); },
      async verifyPayment() { throw new Error('Payment provider is not configured.'); },
      async verifyWebhook() { throw new Error('Payment provider is not configured.'); },
      async getTransaction() { throw new Error('Payment provider is not configured.'); }
    };
  }
  throw new Error(`Unsupported payment provider: ${provider}`);
}
