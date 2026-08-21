# V3 Deployment Gate

A production deployment is allowed only after the staging environment passes the end-to-end and security review plans.

Required before real donations:

- Staging PostgreSQL is separate from production.
- Sandbox payment tests pass.
- Webhook signature, amount, currency, and idempotency tests pass.
- Admin authentication and authorization tests pass.
- Bank/remittance verification tests pass.
- Receipt idempotency test passes.
- Public transparency excludes pending/rejected donations and private donor data.
- Production secrets are configured only in the deployment environment.
- Database backup and restore has been tested.
- Final bank, remittance, organization, contact, and project figures are reviewed.
- A final smoke test passes on the exact deployment intended for production.

If any critical item fails, do not promote the deployment.
