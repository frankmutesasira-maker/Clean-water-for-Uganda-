# V3 security review gate

## Secrets

- No production secrets in source control.
- `DATABASE_URL`, admin session secret, payment credentials, webhook secret, and email credentials are deployment secrets.

## Authentication

- Admin APIs require signed sessions.
- Finance endpoints require an approved finance/admin role.
- Audit-log access is restricted to admin/superadmin roles.

## Financial integrity

- Donation verification is server-side.
- Payment webhook signatures must be verified by the real provider adapter.
- Amount and currency must be checked against the donation record.
- Duplicate provider events must be idempotent.
- Bank/remittance reviews are transactional.
- Receipt issuance is idempotent.
- Ledger entries are protected against duplicate donation entry types.

## Public data

- Public APIs expose verified aggregate information only.
- Do not expose donor email, phone, internal IDs, admin data, bank evidence, or private notes publicly.

## Operational security

- Use separate staging and production databases.
- Enable database backups.
- Test restore procedures.
- Review administrator accounts periodically.
- Use HTTPS in production.
- Configure restrictive security headers.
- Monitor failed authentication and payment-webhook events.

## Launch decision

The application is **not production-ready** until the real payment adapter, production database, administrator provisioning, email delivery, and full end-to-end tests have been completed.
