# Production configuration checklist

Use placeholders during development. Replace them only in the deployment provider's encrypted environment settings; never commit production secrets to GitHub.

## Required

- `DATABASE_URL`
- `ADMIN_SESSION_SECRET`
- Payment provider credentials and webhook secret
- Email provider credentials
- Final organization contact details
- Final bank/remittance receiving details

## Before launch

1. Provision production PostgreSQL.
2. Apply `database/schema.sql`.
3. Create at least one administrator through a secure provisioning process.
4. Configure environment variables in Vercel.
5. Configure the real payment provider and signed webhook endpoint.
6. Confirm webhook idempotency and amount/currency validation.
7. Test bank-transfer and remittance review workflows.
8. Test receipt issuance and audit logging.
9. Verify public transparency totals contain only `verified` donations.
10. Replace all provisional project figures, contact details, and receiving instructions with authoritative values.
11. Run a production backup/restore test.
12. Perform an end-to-end test donation before launch.

## Financial data rule

Do not label estimates, targets, placeholders, or manually entered figures as verified donations or verified spending. Public financial totals must originate from the verified donation records and approved accounting records.
